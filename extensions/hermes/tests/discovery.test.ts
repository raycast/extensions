/**
 * Testes de `discovery.ts` — a leitura de arquivos do Hermes e a descoberta ordenada.
 *
 * Três eixos, nesta ordem de importância:
 *   1. SEGURANÇA: a `API_SERVER_KEY` do `.env` nunca pode escapar por retorno de função,
 *      por mensagem de erro, por `technical`, por stack ou por serialização. O valor
 *      sentinela abaixo é procurado em tudo que a camada produz.
 *   2. O scanner de `config.yaml` sem dependência de YAML: precisa acertar a porta nos
 *      arquivos reais e degradar para `undefined` — nunca lançar — no que não entende.
 *   3. A ordem da descoberta e o gate `platform === "hermes-agent"`, com `deps` injetado
 *      para não tocar rede nem disco.
 *
 * Executar: `node --test tests/discovery.test.ts`
 */

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { inspect } from "node:util";

import "./helpers/module-hooks.mjs";
import { __resetRaycastState, __setPreferences, LocalStorage } from "./helpers/raycast-api-stub.mjs";

// `await import` de propósito: os hooks de resolução precisam estar registrados antes
// (imports estáticos são içados e resolveriam cedo demais). Ver module-hooks.mjs.
const discovery = await import("../src/lib/discovery.ts");
const errors = await import("../src/lib/errors.ts");
const preferences = await import("../src/lib/preferences.ts");
const { StorageKeys } = await import("../src/lib/storage.ts");

const {
  buildPortCandidates,
  extractConfigPort,
  extractDotenvApiKey,
  extractDotenvPort,
  invalidateBaseUrl,
  isHermesAgent,
  parseSimpleYaml,
  readApiKeyFromEnvFile,
  resolveHermesHome,
  resolveBaseUrl,
  defaultHermesHome,
  DEFAULT_PORT,
} = discovery;

/* ══════════════════════════════════ Fixtures ══════════════════════════════════ */

/**
 * Valor sentinela. Não é uma chave real e nenhum teste deve fazê-lo aparecer em saída
 * que não seja o retorno explícito de `extractDotenvApiKey`/`readApiKeyFromEnvFile`.
 */
const FIXTURE_KEY = "NAO_E_UMA_CHAVE_REAL_apenas_fixture";

const HOME = path.join("C:", "fixture", "hermes");
const CONFIG_PATH = path.join(HOME, "config.yaml");
const DOTENV_PATH = path.join(HOME, ".env");
const GATEWAY_PID_PATH = path.join(HOME, "gateway.pid");

/** Recorte fiel do `config.yaml` real desta máquina (docs/research/01 §3.4). */
const CONFIG_REAL = [
  "# Hermes gateway configuration",
  "version: 2",
  "",
  "platforms:",
  "  telegram:",
  "    enabled: false",
  "  api_server:",
  "    enabled: true",
  "    extra:",
  "      host: 127.0.0.1",
  "      port: 8642",
  "  webhook:",
  "    enabled: true",
  "    extra:",
  "      port: 8644",
  "",
].join("\n");

/**
 * `.env` realista: a chave está no meio de outras credenciais, e existe uma variável
 * cujo nome COMEÇA com `API_SERVER_KEY` — o caso que um `startsWith` ingênuo erraria.
 */
const DOTENV_REAL = [
  "# Hermes environment",
  "",
  "OPENAI_API_KEY=sk-fixture-nao-e-real",
  "export API_SERVER_PORT=8643",
  `API_SERVER_KEY=${FIXTURE_KEY}`,
  "API_SERVER_KEY_BACKUP=valor-que-nao-deve-ser-lido",
  'ANTHROPIC_API_KEY="outra-coisa-qualquer"',
  "TELEGRAM_BOT_TOKEN=123456:abcdef",
  "",
].join("\n");

/* ═════════════════════════════════ Utilitários ════════════════════════════════ */

interface FakeFs {
  reads: string[];
  readTextFile: (filePath: string) => Promise<string | undefined>;
}

function fakeFs(files: Record<string, string>): FakeFs {
  const reads: string[] = [];
  return {
    reads,
    async readTextFile(filePath: string) {
      reads.push(filePath);
      return Object.prototype.hasOwnProperty.call(files, filePath) ? files[filePath] : undefined;
    },
  };
}

interface FakeProbe {
  calls: string[];
  probe: (baseUrl: string) => Promise<{ status: string; platform: string; version: string } | undefined>;
}

function fakeProbe(byUrl: Record<string, { status: string; platform: string; version: string }>): FakeProbe {
  const calls: string[] = [];
  return {
    calls,
    async probe(baseUrl: string) {
      calls.push(baseUrl);
      return byUrl[baseUrl];
    },
  };
}

const agent = (version = "0.20.4") => ({ status: "ok", platform: "hermes-agent", version });
const webhook = () => ({ status: "ok", platform: "webhook", version: "0.20.4" });

/** Estado limpo: sem memo, sem cache em LocalStorage, sem preferências. */
async function resetAll(): Promise<void> {
  __resetRaycastState();
  __setPreferences({});
  await invalidateBaseUrl();
}

/* ═══════════════════════ 1. Scanner de config.yaml ═══════════════════════════ */

test("config.yaml: acha a porta no arquivo real, sem confundir com a do webhook", () => {
  assert.equal(extractConfigPort(CONFIG_REAL), 8642);
});

test("config.yaml: aceita os quatro caminhos equivalentes, na ordem de precedência", () => {
  assert.equal(extractConfigPort("platforms:\n  api_server:\n    extra:\n      port: 8801\n"), 8801);
  assert.equal(extractConfigPort("platforms:\n  api_server:\n    port: 8802\n"), 8802);
  assert.equal(extractConfigPort("gateway:\n  platforms:\n    api_server:\n      extra:\n        port: 8803\n"), 8803);
  assert.equal(extractConfigPort("gateway:\n  api_server:\n    port: 8804\n"), 8804);

  // `extra.port` vence `api_server.port` quando os dois existem.
  assert.equal(extractConfigPort("platforms:\n  api_server:\n    port: 8802\n    extra:\n      port: 8801\n"), 8801);
});

test("config.yaml: sobrevive a comentários, linhas em branco, tabs, BOM e aspas", () => {
  const messy = [
    "\uFEFF# comentário de topo",
    "",
    "platforms:",
    "",
    "\t# o api_server fica aqui",
    "  api_server:",
    "    enabled: true   # ligado",
    "    extra:",
    '      port: "8642"  # entre aspas, com comentário no fim',
    "",
  ].join("\r\n");

  assert.equal(extractConfigPort(messy), 8642);
});

test("config.yaml: uma chave `port` fora do escopo do api_server é ignorada", () => {
  const other = [
    "platforms:",
    "  webhook:",
    "    extra:",
    "      port: 8644",
    "  telegram:",
    "    port: 9000",
    "",
  ].join("\n");

  assert.equal(extractConfigPort(other), undefined);
});

test("config.yaml: mapeamento em fluxo `extra: {host: ..., port: ...}`", () => {
  assert.equal(extractConfigPort("platforms:\n  api_server:\n    extra: {host: 127.0.0.1, port: 8642}\n"), 8642);
  assert.equal(extractConfigPort("gateway:\n  platforms:\n    api_server:\n      extra: {port: 8650}\n"), 8650);
});

test("config.yaml: ausente, malformado ou fora de faixa devolve undefined sem lançar", () => {
  const cases: Array<[string, string]> = [
    ["arquivo vazio", ""],
    ["só comentários", "# nada aqui\n# mesmo\n"],
    ["sem o bloco api_server", "platforms:\n  telegram:\n    enabled: true\n"],
    ["porta não numérica", "platforms:\n  api_server:\n    extra:\n      port: automatico\n"],
    ["porta fora de faixa", "platforms:\n  api_server:\n    extra:\n      port: 99999\n"],
    ["porta zero", "platforms:\n  api_server:\n    extra:\n      port: 0\n"],
    ["porta vazia", "platforms:\n  api_server:\n    extra:\n      port:\n"],
    ["indentação inconsistente", "platforms:\n      api_server:\n   extra:\n        port: 8642\n"],
    ["escalar multilinha (não suportado)", "platforms:\n  api_server:\n    extra:\n      port: |\n        8642\n"],
    ["lista onde esperávamos mapa", "platforms:\n  api_server:\n    - extra:\n      - port: 8642\n"],
    ["JSON solto", '{"platforms": {"api_server": {"extra": {"port": 8642}}}}'],
  ];

  for (const [label, text] of cases) {
    assert.doesNotThrow(() => extractConfigPort(text), `não deve lançar: ${label}`);
    assert.equal(extractConfigPort(text), undefined, label);
  }
});

test("parseSimpleYaml: nunca lança, mesmo em entrada hostil", () => {
  const hostile = ["::::", "   ", "- - -", "chave sem valor", "a: b: c", "🙂: 1", "x".repeat(5000) + ": 1"].join("\n");
  assert.doesNotThrow(() => parseSimpleYaml(hostile));
  assert.ok(parseSimpleYaml(hostile).children instanceof Map);
});

/* ═══════════════════════════ 2. Scanner do .env ══════════════════════════════ */

test(".env: extrai a linha API_SERVER_KEY e só ela", () => {
  assert.equal(extractDotenvApiKey(DOTENV_REAL), FIXTURE_KEY);
});

test(".env: não confunde API_SERVER_KEY com um nome que a tem como prefixo", () => {
  const onlyBackup = "API_SERVER_KEY_BACKUP=valor-que-nao-deve-ser-lido\n";
  assert.equal(extractDotenvApiKey(onlyBackup), undefined);
});

test(".env: aceita `export`, aspas, CRLF e BOM; ignora comentários e linhas sem `=`", () => {
  assert.equal(extractDotenvApiKey(`export API_SERVER_KEY=${FIXTURE_KEY}\n`), FIXTURE_KEY);
  assert.equal(extractDotenvApiKey(`API_SERVER_KEY="${FIXTURE_KEY}"\n`), FIXTURE_KEY);
  assert.equal(extractDotenvApiKey(`API_SERVER_KEY='${FIXTURE_KEY}'\n`), FIXTURE_KEY);
  assert.equal(extractDotenvApiKey(`\uFEFFAPI_SERVER_KEY=${FIXTURE_KEY}\r\n`), FIXTURE_KEY);
  assert.equal(extractDotenvApiKey(`  API_SERVER_KEY  =  ${FIXTURE_KEY}  \n`), FIXTURE_KEY);

  assert.equal(extractDotenvApiKey(`# API_SERVER_KEY=${FIXTURE_KEY}\n`), undefined);
  assert.equal(extractDotenvApiKey("API_SERVER_KEY\n"), undefined);
  assert.equal(extractDotenvApiKey("API_SERVER_KEY=\n"), undefined);
  assert.equal(extractDotenvApiKey(""), undefined);
});

test(".env: o primeiro `=` manda — valores com `=` dentro chegam inteiros", () => {
  assert.equal(extractDotenvApiKey("API_SERVER_KEY=abc=def==\n"), "abc=def==");
});

test(".env: extractDotenvPort lê API_SERVER_PORT e nunca outra variável", () => {
  assert.equal(extractDotenvPort(DOTENV_REAL), 8643);
  assert.equal(extractDotenvPort(`API_SERVER_KEY=${FIXTURE_KEY}\n`), undefined);
  assert.equal(extractDotenvPort('API_SERVER_PORT="8642"\n'), 8642);
  assert.equal(extractDotenvPort("API_SERVER_PORT=abc\n"), undefined);
  assert.equal(extractDotenvPort("API_SERVER_PORT_OLD=8642\n"), undefined);
});

test("readApiKeyFromEnvFile: lê só o .env do HERMES_HOME e nada mais", async () => {
  const fs = fakeFs({ [DOTENV_PATH]: DOTENV_REAL, [CONFIG_PATH]: CONFIG_REAL });

  const key = await readApiKeyFromEnvFile(HOME, { readTextFile: fs.readTextFile });

  assert.equal(key, FIXTURE_KEY);
  assert.deepEqual(fs.reads, [DOTENV_PATH], "só o .env pode ser aberto");
});

test("readApiKeyFromEnvFile: .env inacessível ou sem a chave devolve undefined", async () => {
  const semArquivo = fakeFs({});
  assert.equal(await readApiKeyFromEnvFile(HOME, { readTextFile: semArquivo.readTextFile }), undefined);

  const semChave = fakeFs({ [DOTENV_PATH]: "OPENAI_API_KEY=sk-fixture\n" });
  assert.equal(await readApiKeyFromEnvFile(HOME, { readTextFile: semChave.readTextFile }), undefined);
});

/* ══════════════ 3. SEGURANÇA: a chave não vaza por nenhuma saída ══════════════ */

/** Junta tudo que um erro consegue expor a um humano ou a um log. */
function everythingAbout(value: unknown): string {
  const err = value as Error & { technical?: string };
  return [
    String(value),
    err?.message ?? "",
    err?.technical ?? "",
    err?.stack ?? "",
    JSON.stringify(value, Object.getOwnPropertyNames(err ?? {})),
    inspect(value, { depth: 10, showHidden: true }),
  ].join("\n");
}

test("segurança: o valor da chave não aparece em nenhuma saída da descoberta", async () => {
  await resetAll();

  const fs = fakeFs({ [DOTENV_PATH]: DOTENV_REAL, [CONFIG_PATH]: CONFIG_REAL });
  const deps = { env: {} as NodeJS.ProcessEnv, readTextFile: fs.readTextFile };

  // Controle positivo: se ISTO falhar, os testes de vazamento abaixo são vácuos.
  assert.equal(await readApiKeyFromEnvFile(HOME, deps), FIXTURE_KEY);

  const saidas: string[] = [
    String(extractConfigPort(CONFIG_REAL)),
    String(extractDotenvPort(DOTENV_REAL)),
    JSON.stringify(await buildPortCandidates(HOME, deps)),
    JSON.stringify(await resolveHermesHome({ ...deps, env: { HERMES_HOME: HOME } as NodeJS.ProcessEnv })),
    inspect(parseSimpleYaml(CONFIG_REAL), { depth: 10 }),
  ];

  for (const saida of saidas) {
    assert.ok(!saida.includes(FIXTURE_KEY), `vazou a chave em: ${saida.slice(0, 200)}`);
  }
});

test("segurança: erro de conexão não carrega a chave em mensagem, technical, stack ou JSON", async () => {
  await resetAll();

  const fs = fakeFs({ [DOTENV_PATH]: DOTENV_REAL });
  const { probe } = fakeProbe({}); // nada responde

  await assert.rejects(
    () => resolveBaseUrl({ force: true, deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe } }),
    (err: unknown) => {
      assert.ok(err instanceof errors.HermesConnectionError, "deve ser HermesConnectionError");
      const dump = everythingAbout(err);
      assert.ok(!dump.includes(FIXTURE_KEY), "a chave apareceu no erro");
      // ...e o diagnóstico continua útil: diz onde procurou.
      assert.ok((err as { technical: string }).technical.includes("8643"), "deveria citar a porta do .env");
      return true;
    },
  );
});

test("segurança: erro de servidor errado (8644) também não carrega a chave", async () => {
  await resetAll();

  const fs = fakeFs({ [DOTENV_PATH]: DOTENV_REAL });
  const { probe } = fakeProbe({ "http://127.0.0.1:8644": webhook() });

  await assert.rejects(
    () => resolveBaseUrl({ force: true, deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe } }),
    (err: unknown) => {
      assert.ok(err instanceof errors.HermesWrongServerError);
      assert.ok(!everythingAbout(err).includes(FIXTURE_KEY));
      return true;
    },
  );
});

test("segurança: sanitizeTechnical apaga a chave mesmo se alguém a colar num texto técnico", () => {
  const colado = [
    `Authorization: Bearer ${FIXTURE_KEY}`,
    `curl -H "Authorization: Bearer ${FIXTURE_KEY}" http://127.0.0.1:8642/health`,
    `API_SERVER_KEY=${FIXTURE_KEY}`,
    `api_server_key: ${FIXTURE_KEY}`,
  ].join("\n");

  const limpo = errors.sanitizeTechnical(colado);
  assert.ok(!limpo.includes(FIXTURE_KEY), `sobrou a chave em: ${limpo}`);
});

test("segurança: um HermesError construído com a chave no technical já nasce redigido", () => {
  const err = new errors.HermesConnectionError({
    userMessage: "Could not connect to Hermes.",
    technical: `falhou com API_SERVER_KEY=${FIXTURE_KEY}`,
    recovery: "start_hermes",
  });

  assert.ok(!err.technical.includes(FIXTURE_KEY));
  assert.ok(!everythingAbout(err).includes(FIXTURE_KEY));
});

/* ═════════════════════ 4. Ordem da descoberta e gate /health ═════════════════ */

/*
 * A pasta padrão do Hermes muda com o sistema, e os testes NÃO podem depender do sistema
 * em que estão rodando: `platform` e `homeDir` entram injetados, e `defaultHermesHome()`
 * usa `path.win32`/`path.posix` explícitos para que o resultado seja o mesmo em qualquer
 * máquina. Um teste do macOS aqui passa rodando no Windows, e é essa a intenção.
 */
const WINDOWS_HOME_DIR = path.win32.join("C:", "Users", "sam");
const WINDOWS_ENV = { LOCALAPPDATA: path.win32.join(WINDOWS_HOME_DIR, "AppData", "Local") } as NodeJS.ProcessEnv;
const WINDOWS_DEFAULT_HOME = path.win32.join(WINDOWS_HOME_DIR, "AppData", "Local", "hermes");
const MAC_HOME_DIR = "/Users/sam";
const MAC_DEFAULT_HOME = "/Users/sam/.hermes";

/**
 * Chaves de fixture montadas com o separador do sistema SIMULADO, nunca com o `path.join`
 * da maquina que esta rodando a suite.
 *
 * A diferenca nao e cosmetica. Enquanto os dois lados usavam `path.join`, o separador
 * errado aparecia na chave do fixture E no que o codigo sob teste procurava, e os dois
 * erros se cancelavam: o teste do macOS passava no Windows procurando por
 * `\Users\sam\.hermes\gateway.pid`, um caminho que nenhum Mac tem. Passava por
 * construcao, nao por acerto - exatamente o tipo de cobertura que nao cobre nada.
 */
function macFile(name: string): string {
  return `${MAC_DEFAULT_HOME}/${name}`;
}

function windowsFile(name: string): string {
  return path.win32.join(WINDOWS_DEFAULT_HOME, name);
}

test("pasta padrão: %LOCALAPPDATA%\\hermes no Windows, ~/.hermes no macOS", () => {
  assert.equal(
    defaultHermesHome({ env: WINDOWS_ENV, platform: "win32", homeDir: WINDOWS_HOME_DIR }),
    WINDOWS_DEFAULT_HOME,
  );

  // Sem %LOCALAPPDATA% no ambiente: o mesmo caminho que o próprio Windows usaria.
  assert.equal(
    defaultHermesHome({ env: {} as NodeJS.ProcessEnv, platform: "win32", homeDir: WINDOWS_HOME_DIR }),
    WINDOWS_DEFAULT_HOME,
  );

  assert.equal(
    defaultHermesHome({ env: {} as NodeJS.ProcessEnv, platform: "darwin", homeDir: MAC_HOME_DIR }),
    MAC_DEFAULT_HOME,
  );

  // Um %LOCALAPPDATA% herdado no ambiente não pode vazar para o ramo do macOS.
  assert.equal(defaultHermesHome({ env: WINDOWS_ENV, platform: "darwin", homeDir: MAC_HOME_DIR }), MAC_DEFAULT_HOME);
});

test("HERMES_HOME do ambiente vence a pasta padrão e o gateway.pid, nos dois sistemas", async () => {
  for (const platform of ["win32", "darwin"] as const) {
    const fs = fakeFs({
      [windowsFile("gateway.pid")]: JSON.stringify({ hermes_home: "outro", pid: 42 }),
      [macFile("gateway.pid")]: JSON.stringify({ hermes_home: "outro", pid: 42 }),
    });

    assert.equal(
      await resolveHermesHome({
        env: { HERMES_HOME: HOME } as NodeJS.ProcessEnv,
        platform,
        readTextFile: fs.readTextFile,
      }),
      HOME,
      `HERMES_HOME deveria vencer em ${platform}`,
    );
  }
});

test("sem HERMES_HOME: gateway.pid.hermes_home da pasta padrão vence, nos dois sistemas", async () => {
  const windowsFs = fakeFs({
    [windowsFile("gateway.pid")]: JSON.stringify({ hermes_home: HOME, pid: 42 }),
  });
  assert.equal(
    await resolveHermesHome({
      env: WINDOWS_ENV,
      platform: "win32",
      homeDir: WINDOWS_HOME_DIR,
      readTextFile: windowsFs.readTextFile,
    }),
    HOME,
  );

  const macFs = fakeFs({
    [macFile("gateway.pid")]: JSON.stringify({ hermes_home: "/Volumes/Trabalho/hermes", pid: 42 }),
  });
  assert.equal(
    await resolveHermesHome({
      env: {} as NodeJS.ProcessEnv,
      platform: "darwin",
      homeDir: MAC_HOME_DIR,
      readTextFile: macFs.readTextFile,
    }),
    "/Volumes/Trabalho/hermes",
  );
});

test("sem HERMES_HOME e sem gateway.pid: sobra a pasta padrão do sistema", async () => {
  const vazio = fakeFs({});

  assert.equal(
    await resolveHermesHome({
      env: WINDOWS_ENV,
      platform: "win32",
      homeDir: WINDOWS_HOME_DIR,
      readTextFile: vazio.readTextFile,
    }),
    WINDOWS_DEFAULT_HOME,
  );

  assert.equal(
    await resolveHermesHome({
      env: {} as NodeJS.ProcessEnv,
      platform: "darwin",
      homeDir: MAC_HOME_DIR,
      readTextFile: vazio.readTextFile,
    }),
    MAC_DEFAULT_HOME,
  );
});

test("gateway.pid corrompido ou sem hermes_home degrada para a pasta padrão", async () => {
  const corrompido = fakeFs({ [macFile("gateway.pid")]: "{ isto nao e json" });
  assert.equal(
    await resolveHermesHome({
      env: {} as NodeJS.ProcessEnv,
      platform: "darwin",
      homeDir: MAC_HOME_DIR,
      readTextFile: corrompido.readTextFile,
    }),
    MAC_DEFAULT_HOME,
  );

  const semCampo = fakeFs({ [windowsFile("gateway.pid")]: JSON.stringify({ pid: 42 }) });
  assert.equal(
    await resolveHermesHome({
      env: WINDOWS_ENV,
      platform: "win32",
      homeDir: WINDOWS_HOME_DIR,
      readTextFile: semCampo.readTextFile,
    }),
    WINDOWS_DEFAULT_HOME,
  );
});

test("candidatas: config.yaml > API_SERVER_PORT > .env > 8642, deduplicadas", async () => {
  // Porta diferente da default, para ver as duas candidatas na ordem certa.
  const comConfig = fakeFs({
    [CONFIG_PATH]: "platforms:\n  api_server:\n    extra:\n      port: 8801\n",
    [DOTENV_PATH]: DOTENV_REAL,
  });
  assert.deepEqual(
    await buildPortCandidates(HOME, { env: {} as NodeJS.ProcessEnv, readTextFile: comConfig.readTextFile }),
    [
      { port: 8801, source: "config" },
      { port: DEFAULT_PORT, source: "default" },
    ],
  );
  assert.ok(!comConfig.reads.includes(DOTENV_PATH), "o .env não deve ser aberto quando o config.yaml resolveu");

  // O config.yaml real aponta para 8642: a candidata default some por deduplicação.
  const igualAoDefault = fakeFs({ [CONFIG_PATH]: CONFIG_REAL });
  assert.deepEqual(
    await buildPortCandidates(HOME, { env: {} as NodeJS.ProcessEnv, readTextFile: igualAoDefault.readTextFile }),
    [{ port: 8642, source: "config" }],
  );

  const semConfig = fakeFs({ [DOTENV_PATH]: DOTENV_REAL });
  assert.deepEqual(
    await buildPortCandidates(HOME, { env: {} as NodeJS.ProcessEnv, readTextFile: semConfig.readTextFile }),
    [
      { port: 8643, source: "dotenv" },
      { port: DEFAULT_PORT, source: "default" },
    ],
  );

  const comEnv = fakeFs({ [DOTENV_PATH]: DOTENV_REAL });
  assert.deepEqual(
    await buildPortCandidates(HOME, {
      env: { API_SERVER_PORT: "8700" } as NodeJS.ProcessEnv,
      readTextFile: comEnv.readTextFile,
    }),
    [
      { port: 8700, source: "env" },
      { port: DEFAULT_PORT, source: "default" },
    ],
  );

  const soDefault = fakeFs({});
  assert.deepEqual(
    await buildPortCandidates(HOME, { env: {} as NodeJS.ProcessEnv, readTextFile: soDefault.readTextFile }),
    [{ port: DEFAULT_PORT, source: "default" }],
  );

  // config.yaml apontando para 8642 não duplica a candidata default.
  const dedup = fakeFs({ [CONFIG_PATH]: "platforms:\n  api_server:\n    extra:\n      port: 8642\n" });
  const candidatas = await buildPortCandidates(HOME, {
    env: { API_SERVER_PORT: "8642" } as NodeJS.ProcessEnv,
    readTextFile: dedup.readTextFile,
  });
  assert.deepEqual(candidatas, [{ port: 8642, source: "config" }]);
});

test("gate: só `status:ok` + `platform:hermes-agent` é aceito", () => {
  assert.equal(isHermesAgent(agent()), true);
  assert.equal(isHermesAgent(webhook()), false);
  assert.equal(isHermesAgent({ status: "degraded", platform: "hermes-agent", version: "0.20.4" }), false);
  assert.equal(isHermesAgent(undefined), false);
});

test("descoberta: sonda sempre 127.0.0.1 literal, nunca localhost", async () => {
  await resetAll();

  const fs = fakeFs({ [CONFIG_PATH]: CONFIG_REAL });
  const { calls, probe } = fakeProbe({ "http://127.0.0.1:8642": agent() });

  const endpoint = await resolveBaseUrl({
    force: true,
    deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe },
  });

  assert.deepEqual(endpoint, { baseUrl: "http://127.0.0.1:8642", version: "0.20.4", source: "config" });
  assert.ok(calls.length > 0);
  for (const url of calls) {
    assert.ok(url.startsWith("http://127.0.0.1:"), `sondou host proibido: ${url}`);
    assert.ok(!url.includes("localhost"), `sondou localhost: ${url}`);
  }
});

test("descoberta: a 8644 respondendo `webhook` é rejeitada e vira diagnóstico preciso", async () => {
  await resetAll();

  // O config.yaml aponta para 8644 (erro clássico de instalação).
  const fs = fakeFs({ [CONFIG_PATH]: "platforms:\n  api_server:\n    extra:\n      port: 8644\n" });
  const { probe } = fakeProbe({ "http://127.0.0.1:8644": webhook() });

  await assert.rejects(
    () => resolveBaseUrl({ force: true, deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe } }),
    (err: unknown) => {
      assert.ok(err instanceof errors.HermesWrongServerError);
      const technical = (err as { technical: string }).technical;
      assert.ok(technical.includes("webhook"), "o technical deve nomear a plataforma encontrada");
      assert.ok(technical.includes("8644"));
      return true;
    },
  );
});

test("descoberta: cai para a porta seguinte quando a primeira candidata não é o Hermes", async () => {
  await resetAll();

  const fs = fakeFs({ [CONFIG_PATH]: "platforms:\n  api_server:\n    extra:\n      port: 8700\n" });
  const { calls, probe } = fakeProbe({
    "http://127.0.0.1:8700": webhook(),
    "http://127.0.0.1:8642": agent("0.20.4"),
  });

  const endpoint = await resolveBaseUrl({
    force: true,
    deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe },
  });

  assert.equal(endpoint.baseUrl, "http://127.0.0.1:8642");
  assert.equal(endpoint.source, "default");
  assert.deepEqual(calls, ["http://127.0.0.1:8700", "http://127.0.0.1:8642"]);
});

test("preferência apiUrl: vence e NÃO cai para a descoberta automática", async () => {
  await resetAll();
  __setPreferences({ apiUrl: "http://127.0.0.1:9999/" });

  const fs = fakeFs({ [CONFIG_PATH]: CONFIG_REAL });

  // (a) endereço certo: usa e pronto.
  const ok = fakeProbe({ "http://127.0.0.1:9999": agent("0.20.4") });
  const endpoint = await resolveBaseUrl({
    force: true,
    deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe: ok.probe },
  });
  assert.deepEqual(endpoint, { baseUrl: "http://127.0.0.1:9999", version: "0.20.4", source: "preference" });
  assert.deepEqual(ok.calls, ["http://127.0.0.1:9999"], "não pode sondar mais nada");

  // (b) endereço aponta para o webhook: erro, sem fallback.
  await invalidateBaseUrl();
  const errado = fakeProbe({ "http://127.0.0.1:9999": webhook(), "http://127.0.0.1:8642": agent() });
  await assert.rejects(
    () =>
      resolveBaseUrl({
        force: true,
        deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe: errado.probe },
      }),
    errors.HermesWrongServerError,
  );
  assert.deepEqual(errado.calls, ["http://127.0.0.1:9999"], "não pode tentar a 8642 por conta própria");

  // (c) endereço morto: erro de conexão, sem fallback.
  await invalidateBaseUrl();
  const morto = fakeProbe({ "http://127.0.0.1:8642": agent() });
  await assert.rejects(
    () =>
      resolveBaseUrl({
        force: true,
        deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe: morto.probe },
      }),
    errors.HermesConnectionError,
  );
  assert.deepEqual(morto.calls, ["http://127.0.0.1:9999"]);
});

test("normalizeBaseUrl: localhost e ::1 viram 127.0.0.1 (a porta escuta só IPv4)", () => {
  assert.equal(preferences.normalizeBaseUrl("http://localhost:8642"), "http://127.0.0.1:8642");
  assert.equal(preferences.normalizeBaseUrl("localhost:8642"), "http://127.0.0.1:8642");
  assert.equal(preferences.normalizeBaseUrl("http://[::1]:8642"), "http://127.0.0.1:8642");
  assert.equal(preferences.normalizeBaseUrl("http://127.0.0.1:8642/"), "http://127.0.0.1:8642");
  assert.equal(preferences.normalizeBaseUrl("127.0.0.1:8642"), "http://127.0.0.1:8642");
  assert.equal(preferences.normalizeBaseUrl("   "), undefined);
  assert.equal(preferences.normalizeBaseUrl("nao é uma url"), undefined);
});

/**
 * A porta é do usuário, o host não. Toda requisição leva `Authorization: Bearer
 * <API_SERVER_KEY>` (`hermes-api.ts`), então um host de fora entregaria a chave do Hermes
 * a um terceiro — e o README promete que a extensão só fala com `127.0.0.1`.
 */
test("normalizeBaseUrl: a porta é livre, o host tem de ser a própria máquina", () => {
  // Aceita a faixa inteira de loopback, em qualquer porta, e sem reescrever o IP pedido.
  assert.equal(preferences.normalizeBaseUrl("http://127.0.0.1:1"), "http://127.0.0.1:1");
  assert.equal(preferences.normalizeBaseUrl("127.0.0.1:65535"), "http://127.0.0.1:65535");
  assert.equal(preferences.normalizeBaseUrl("http://127.0.0.5:8642"), "http://127.0.0.5:8642");
  assert.equal(preferences.normalizeBaseUrl("http://127.255.255.254:8642"), "http://127.255.255.254:8642");
  // Formas abreviadas de IPv4 que o `URL` do Node expande para 127.0.0.1.
  assert.equal(preferences.normalizeBaseUrl("http://127.1:8642"), "http://127.0.0.1:8642");
  assert.equal(preferences.normalizeBaseUrl("http://2130706433:8642"), "http://127.0.0.1:8642");

  // Recusas. `undefined` em `normalizeBaseUrl`, "not-loopback" em `checkBaseUrl`.
  const refused = [
    "http://exemplo.com",
    "https://exemplo.com:8642",
    "exemplo.com:8642",
    "http://192.168.0.10:8642",
    "http://10.0.0.1:8642",
    "http://0.0.0.0:8642",
    "http://169.254.169.254", // metadata de nuvem: o alvo clássico de um SSRF
    "http://localhost.exemplo.com:8642",
    "http://[::ffff:127.0.0.1]:8642", // loopback de verdade, mas exótico: falha fechado
    "http://[2606:4700:4700::1111]:8642",
  ];
  for (const address of refused) {
    assert.equal(preferences.normalizeBaseUrl(address), undefined, `${address} tinha de ser recusado`);
    assert.equal(preferences.checkBaseUrl(address).refusal, "not-loopback", `${address}: motivo errado`);
  }

  // `127.0.0.1` no userinfo não torna o destino local — o host é o que vem depois do `@`.
  assert.equal(preferences.checkBaseUrl("http://127.0.0.1@exemplo.com/").host, "exemplo.com");

  // Campo em branco não é recusa: é "descubra sozinho".
  assert.deepEqual(preferences.checkBaseUrl("   "), {});
  assert.equal(preferences.checkBaseUrl("nao é uma url").refusal, "malformed");
});

test("preferência apiUrl fora do loopback: erro na tela, sem sondar e sem descoberta automática", async () => {
  await resetAll();
  __setPreferences({ apiUrl: "http://exemplo.com:8642" });

  const fs = fakeFs({ [CONFIG_PATH]: CONFIG_REAL });
  const { calls, probe } = fakeProbe({ "http://127.0.0.1:8642": agent() });

  await assert.rejects(
    () =>
      resolveBaseUrl({
        force: true,
        deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe },
      }),
    (err: unknown) => {
      // A recusa tem de chegar ao usuário, em inglês, com o caminho de conserto.
      assert.ok(err instanceof errors.HermesWrongServerError);
      assert.equal(err.recovery, "open_preferences");
      assert.match(err.userMessage, /must point to your own computer/);
      assert.match(err.userMessage, /127\.0\.0\.1/);
      assert.match(err.technical, /exemplo\.com/);
      return true;
    },
  );

  assert.deepEqual(calls, [], "nem uma sondagem: a recusa acontece antes de abrir conexão");
});

test("cache: resolveBaseUrl memoriza, invalidateBaseUrl derruba memo e LocalStorage", async () => {
  await resetAll();

  const fs = fakeFs({ [CONFIG_PATH]: CONFIG_REAL, [GATEWAY_PID_PATH]: JSON.stringify({ pid: 7, start_time: 111 }) });
  const primeira = fakeProbe({ "http://127.0.0.1:8642": agent() });

  await resolveBaseUrl({
    force: true,
    deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe: primeira.probe },
  });
  assert.equal(primeira.calls.length, 1);

  // Segunda chamada sem `force`: serve do memo, sem sondar de novo.
  const segunda = fakeProbe({});
  const doMemo = await resolveBaseUrl({
    deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe: segunda.probe },
  });
  assert.equal(doMemo.baseUrl, "http://127.0.0.1:8642");
  assert.deepEqual(segunda.calls, []);

  // Depois de invalidar, volta a sondar — agora pelo cache do LocalStorage.
  await invalidateBaseUrl();
  const terceira = fakeProbe({ "http://127.0.0.1:8642": agent() });
  await resolveBaseUrl({
    deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe: terceira.probe },
  });
  assert.ok(terceira.calls.length >= 1, "invalidateBaseUrl precisa forçar uma nova sondagem");
});

/**
 * Cada comando do Raycast roda num processo novo, então o `memo` em memória nasce vazio e
 * quem decide é o cache durável do LocalStorage. Estes dois testes simulam isso gravando a
 * entrada de cache "de uma execução anterior" à mão.
 */
async function seedEndpointCache(entry: Record<string, unknown>): Promise<void> {
  await LocalStorage.setItem(StorageKeys.endpointCache, JSON.stringify(entry));
}

test("cache: entrada do mesmo gateway é reaproveitada com uma sondagem rápida", async () => {
  await resetAll();
  await seedEndpointCache({
    baseUrl: "http://127.0.0.1:8700",
    version: "0.20.3",
    source: "config",
    gatewayPid: 7,
    gatewayStartTime: 111,
    checkedAt: Date.now(),
  });

  const fs = fakeFs({ [CONFIG_PATH]: CONFIG_REAL, [GATEWAY_PID_PATH]: JSON.stringify({ pid: 7, start_time: 111 }) });
  const { calls, probe } = fakeProbe({ "http://127.0.0.1:8700": agent("0.20.3") });

  const endpoint = await resolveBaseUrl({
    deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe },
  });

  assert.deepEqual(endpoint, { baseUrl: "http://127.0.0.1:8700", version: "0.20.3", source: "cache" });
  assert.deepEqual(calls, ["http://127.0.0.1:8700"], "não deve varrer as candidatas quando o cache serve");
});

test("cache: entrada de outro processo de gateway é descartada", async () => {
  await resetAll();
  await seedEndpointCache({
    baseUrl: "http://127.0.0.1:8700",
    version: "0.20.3",
    source: "config",
    gatewayPid: 7,
    gatewayStartTime: 111,
    checkedAt: Date.now(),
  });

  // O gateway reiniciou: outro pid e outro start_time.
  const fs = fakeFs({ [CONFIG_PATH]: CONFIG_REAL, [GATEWAY_PID_PATH]: JSON.stringify({ pid: 99, start_time: 222 }) });
  const { calls, probe } = fakeProbe({ "http://127.0.0.1:8642": agent("0.20.5") });

  const endpoint = await resolveBaseUrl({
    deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe },
  });

  assert.equal(endpoint.source, "config", "não pode servir do cache com pid diferente");
  assert.equal(endpoint.version, "0.20.5");
  assert.ok(!calls.includes("http://127.0.0.1:8700"), "a baseUrl obsoleta nem devia ser sondada");
});

test("cache: entrada velha demais (> 12 h) é descartada", async () => {
  await resetAll();
  await seedEndpointCache({
    baseUrl: "http://127.0.0.1:8700",
    version: "0.20.3",
    source: "config",
    gatewayPid: 7,
    gatewayStartTime: 111,
    checkedAt: Date.now() - 13 * 60 * 60 * 1000,
  });

  const fs = fakeFs({ [CONFIG_PATH]: CONFIG_REAL, [GATEWAY_PID_PATH]: JSON.stringify({ pid: 7, start_time: 111 }) });
  const { calls, probe } = fakeProbe({ "http://127.0.0.1:8642": agent() });

  const endpoint = await resolveBaseUrl({
    deps: { env: { HERMES_HOME: HOME }, readTextFile: fs.readTextFile, probe },
  });

  assert.equal(endpoint.source, "config");
  assert.ok(!calls.includes("http://127.0.0.1:8700"));
});

/* ═════════════ 5. Precedência da chave: preferência > detectada ══════════════ */

test("chave: a preferência vence a chave detectada no LocalStorage", async () => {
  await resetAll();
  await LocalStorage.setItem(StorageKeys.detectedApiKey, "chave-detectada-no-env");
  __setPreferences({ apiServerKey: "chave-digitada-na-preferencia" });

  assert.deepEqual(await preferences.resolveApiKey(), {
    key: "chave-digitada-na-preferencia",
    source: "preference",
  });
});

test("chave: sem preferência usa a detectada; sem nada exige configuração", async () => {
  await resetAll();
  await LocalStorage.setItem(StorageKeys.detectedApiKey, "chave-detectada-no-env");
  assert.deepEqual(await preferences.resolveApiKey(), { key: "chave-detectada-no-env", source: "detected" });
  assert.equal(await preferences.isConfigured(), true);

  await resetAll();
  assert.deepEqual(await preferences.resolveApiKey(), { key: "", source: "none" });
  assert.equal(await preferences.isConfigured(), false);
  await assert.rejects(() => preferences.requireApiKey(), errors.HermesNotConfiguredError);
});

test("chave: preferência só com espaços conta como vazia", async () => {
  await resetAll();
  __setPreferences({ apiServerKey: "   " });
  await LocalStorage.setItem(StorageKeys.detectedApiKey, "chave-detectada-no-env");

  assert.equal((await preferences.resolveApiKey()).source, "detected");
});

test("resolveHermesConfig: sem chave nem tenta descobrir o endereço", async () => {
  await resetAll();
  await assert.rejects(() => preferences.resolveHermesConfig(), errors.HermesNotConfiguredError);
});

/**
 * Prova que o `await import("./discovery")` dentro de preferences.ts resolve de verdade —
 * é o único caminho de produção que o resto da suíte não exercita, e uma falha ali só
 * apareceria dentro do Raycast. Usa uma porta de loopback onde nada escuta: o ECONNREFUSED
 * volta na hora, sem espera de timeout.
 */
test("resolveHermesConfig: carrega discovery tardiamente e propaga o erro do Hermes", async () => {
  await resetAll();
  __setPreferences({ apiServerKey: "chave-de-teste", apiUrl: "http://127.0.0.1:45999" });

  await assert.rejects(
    () => preferences.resolveHermesConfig(),
    (err: unknown) => {
      assert.ok(err instanceof errors.HermesError, `esperava um HermesError, veio: ${String(err)}`);
      assert.ok(!(err instanceof errors.HermesNotConfiguredError));
      return true;
    },
  );
});

/* ═══════════ hermesDesktopSessionUrl — deep link do Hermes Desktop (§6.3) ═══════════ */

test("hermesDesktopSessionUrl: monta o link dos três formatos reais de id", () => {
  assert.equal(discovery.hermesDesktopSessionUrl("api_1787173253_21269392"), "hermes://open/api_1787173253_21269392");
  assert.equal(
    discovery.hermesDesktopSessionUrl("raycast_1787173253_a1b2c3d4"),
    "hermes://open/raycast_1787173253_a1b2c3d4",
  );
  assert.equal(discovery.hermesDesktopSessionUrl("a1b2c3d4"), "hermes://open/a1b2c3d4");
});

test("hermesDesktopSessionUrl: recusa o que o parser do Desktop não aceita", () => {
  // Sem id não há ação: a UI omite "Abrir no Hermes Desktop" em vez de abrir errado.
  assert.equal(discovery.hermesDesktopSessionUrl(undefined), undefined);
  assert.equal(discovery.hermesDesktopSessionUrl(""), undefined);
  assert.equal(discovery.hermesDesktopSessionUrl("com/barra"), undefined);
  assert.equal(discovery.hermesDesktopSessionUrl("com\\contrabarra"), undefined);
  assert.equal(discovery.hermesDesktopSessionUrl("com:doispontos"), undefined);
  assert.equal(discovery.hermesDesktopSessionUrl(".."), undefined);
  assert.equal(discovery.hermesDesktopSessionUrl("subiu..de..nivel"), undefined);
});

test("hermesDesktopSessionUrl: escapa o que sobra, sem quebrar o esquema", () => {
  assert.equal(discovery.hermesDesktopSessionUrl("com espaço"), "hermes://open/com%20espa%C3%A7o");
  assert.equal(discovery.hermesDesktopSessionUrl("com?query#hash"), "hermes://open/com%3Fquery%23hash");
});

test("os arquivos do Hermes são procurados com o separador do sistema simulado", async () => {
  // Este é o teste que faltava. Os outros conferem o RESULTADO da descoberta; nenhum
  // conferia o CAMINHO pedido, e enquanto fixture e código usavam o mesmo `path.join`
  // errado o caso do macOS passava procurando `\Users\sam\.hermes\...` — inexistente num
  // Mac. Aqui a expectativa é escrita à mão, então não há como os dois erros se cancelarem.
  const mac = fakeFs({});
  await resolveHermesHome({
    env: WINDOWS_ENV,
    platform: "darwin",
    homeDir: MAC_HOME_DIR,
    readTextFile: mac.readTextFile,
  });
  assert.deepEqual(mac.reads, ["/Users/sam/.hermes/gateway.pid"]);
  for (const lido of mac.reads) {
    assert.equal(lido.includes("\\"), false, `caminho de macOS com contrabarra: ${lido}`);
  }

  const windows = fakeFs({});
  await resolveHermesHome({
    env: WINDOWS_ENV,
    platform: "win32",
    homeDir: WINDOWS_HOME_DIR,
    readTextFile: windows.readTextFile,
  });
  assert.deepEqual(windows.reads, [path.win32.join(WINDOWS_DEFAULT_HOME, "gateway.pid")]);
  for (const lido of windows.reads) {
    assert.equal(lido.includes("/"), false, `caminho de Windows com barra: ${lido}`);
  }
});

test("as portas candidatas e o .env também respeitam o sistema simulado", async () => {
  const mac = fakeFs({});
  await discovery.buildPortCandidates(MAC_DEFAULT_HOME, {
    env: {} as NodeJS.ProcessEnv,
    platform: "darwin",
    readTextFile: mac.readTextFile,
  });
  assert.deepEqual(mac.reads, ["/Users/sam/.hermes/config.yaml", "/Users/sam/.hermes/.env"]);

  const macEnv = fakeFs({});
  await discovery.readApiKeyFromEnvFile(MAC_DEFAULT_HOME, { platform: "darwin", readTextFile: macEnv.readTextFile });
  assert.deepEqual(macEnv.reads, ["/Users/sam/.hermes/.env"]);

  const windows = fakeFs({});
  await discovery.buildPortCandidates(WINDOWS_DEFAULT_HOME, {
    env: {} as NodeJS.ProcessEnv,
    platform: "win32",
    readTextFile: windows.readTextFile,
  });
  assert.deepEqual(windows.reads, [
    path.win32.join(WINDOWS_DEFAULT_HOME, "config.yaml"),
    path.win32.join(WINDOWS_DEFAULT_HOME, ".env"),
  ]);
});
