/**
 * Testes de `hermes-api.ts` — as invariantes de TRANSPORTE, que são as que quebram tudo
 * de uma vez quando saem do lugar:
 *
 *   1. `Authorization: Bearer <chave>` precisa carregar a CHAVE, não uma Promise.
 *      `requireApiKey()` é assíncrona; um `await` esquecido produzia
 *      `Bearer [object Promise]` e todo pedido autenticado voltava 401. O TypeScript
 *      não pega isso porque interpolar uma Promise num template literal é legal.
 *   2. NENHUMA requisição pode enviar `Origin` — o middleware de CORS responde 403 com
 *      corpo vazio antes mesmo de autenticar.
 *   3. `anonymous` (só `/health`) não pode mandar `Authorization`.
 *
 * O `fetch` global é substituído: nada aqui toca a rede. A descoberta de endpoint também
 * passa por `fetch` (a sonda `/health`), então o mesmo duplo cobre as duas coisas.
 *
 * Executar: `node --test tests/hermes-api.test.ts`
 */

import test from "node:test";
import assert from "node:assert/strict";

import "./helpers/module-hooks.mjs";
import { __resetRaycastState, __setPreferences } from "./helpers/raycast-api-stub.mjs";

const { conversationTitle, conversationTitleAttempt, requestJson, startConversation } =
  await import("../src/lib/hermes-api.ts");
const { invalidateBaseUrl } = await import("../src/lib/discovery.ts");
const { isAbort } = await import("../src/lib/errors.ts");

const BASE_URL = "http://127.0.0.1:8642";
/** Valor sentinela: não é uma chave real. */
const FIXTURE_KEY = "NAO_E_UMA_CHAVE_REAL_apenas_fixture";

interface CapturedRequest {
  url: string;
  headers: Headers;
}

const captured: CapturedRequest[] = [];
const realFetch = globalThis.fetch;

/**
 * Duplo do `fetch`: responde `/health` como o api_server e qualquer outra rota com um
 * JSON vazio. Registra toda requisição para as asserções sobre headers.
 */
function installFetchDouble(): void {
  captured.length = 0;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    captured.push({ url, headers: new Headers(init?.headers) });

    const body = url.endsWith("/health")
      ? JSON.stringify({ status: "ok", platform: "hermes-agent", version: "0.20.4" })
      : JSON.stringify({ ok: true });

    return new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof globalThis.fetch;
}

async function setup(preferences: Record<string, unknown> = {}): Promise<void> {
  __resetRaycastState();
  __setPreferences({ apiServerKey: FIXTURE_KEY, apiUrl: BASE_URL, ...preferences });
  installFetchDouble();
  // O endpoint é memoizado no módulo: sem isto um teste herdaria a resolução do anterior.
  await invalidateBaseUrl();
}

test.after(() => {
  globalThis.fetch = realFetch;
});

/** A requisição de negócio é a última; as anteriores são sondas `/health` da descoberta. */
function lastRequest(): CapturedRequest {
  const request = captured.at(-1);
  assert.ok(request, "nenhuma requisição foi capturada");
  return request;
}

test("Authorization carrega a chave resolvida, nunca uma Promise", async () => {
  await setup();
  await requestJson({ path: "/v1/capabilities" });

  const authorization = lastRequest().headers.get("Authorization");
  assert.equal(authorization, `Bearer ${FIXTURE_KEY}`);
});

test("nenhum header de Authorization contém o rastro de uma Promise não aguardada", async () => {
  await setup();
  await requestJson({ path: "/v1/capabilities" });

  for (const request of captured) {
    const authorization = request.headers.get("Authorization") ?? "";
    assert.ok(!authorization.includes("Promise"), `header vazou uma Promise: ${authorization}`);
    assert.ok(!authorization.includes("object"), `header vazou um objeto: ${authorization}`);
  }
});

test("a chave detectada no LocalStorage também chega ao header (o caminho assíncrono)", async () => {
  await setup({ apiServerKey: undefined });
  const { saveDetectedApiKey } = await import("../src/lib/storage.ts");
  await saveDetectedApiKey(FIXTURE_KEY);

  await requestJson({ path: "/v1/capabilities" });
  assert.equal(lastRequest().headers.get("Authorization"), `Bearer ${FIXTURE_KEY}`);
});

test("NENHUMA requisição envia Origin — o CORS responde 403 antes de autenticar", async () => {
  await setup();
  await requestJson({ path: "/v1/capabilities" });

  assert.ok(captured.length > 0, "esperava ao menos a sonda /health e o pedido");
  for (const request of captured) {
    assert.equal(request.headers.get("Origin"), null, `${request.url} enviou Origin`);
  }
});

test("requisição anônima (/health) não manda Authorization", async () => {
  await setup();
  await requestJson({ path: "/health", anonymous: true });

  assert.equal(lastRequest().headers.get("Authorization"), null);
});

test("X-Hermes-Session-Key só vai quando a rota pede, e sem caracteres proibidos", async () => {
  await setup({ sessionKey: "raycast:windows:default" });

  await requestJson({ path: "/v1/capabilities" });
  assert.equal(lastRequest().headers.get("X-Hermes-Session-Key"), null);

  await requestJson({ method: "POST", path: "/v1/runs", body: { input: "oi" }, withSessionKey: true });
  assert.equal(lastRequest().headers.get("X-Hermes-Session-Key"), "raycast:windows:default");
});

test("sem chave nenhuma, o pedido falha ANTES de tocar a rede", async () => {
  await setup({ apiServerKey: undefined });

  await assert.rejects(
    () => requestJson({ path: "/v1/capabilities" }),
    (err: unknown) => {
      assert.equal((err as Error).name, "HermesNotConfiguredError");
      return true;
    },
  );
  assert.equal(captured.length, 0, "não pode haver requisição sem chave resolvida");
});

/* ══════════════ Retry de transporte (ARCHITECTURE §12.2) ══════════════ */

/**
 * Duplo programável: cada rota devolve a próxima resposta da fila e, quando a fila acaba,
 * repete a última. É o que permite afirmar "tentou de novo UMA vez", que é a única forma
 * de provar as regras de retry — elas não têm efeito visível no valor devolvido.
 */
function installScriptedFetch(script: Record<string, (() => Response | Promise<Response>)[]>): void {
  captured.length = 0;
  const queues = new Map(Object.entries(script).map(([path, steps]) => [path, [...steps]]));

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    captured.push({ url, headers: new Headers(init?.headers) });

    const path = new URL(url).pathname;
    const queue = queues.get(path);
    if (queue !== undefined && queue.length > 0) {
      const step = queue.length === 1 ? queue[0] : queue.shift();
      return step!();
    }
    if (path === "/health") {
      return new Response(JSON.stringify({ status: "ok", platform: "hermes-agent", version: "0.20.4" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function requestsTo(path: string): number {
  return captured.filter((request) => new URL(request.url).pathname === path).length;
}

test("GET em 503 é repetido UMA vez, honrando o Retry-After", async () => {
  await setup();
  let calls = 0;
  installScriptedFetch({
    "/v1/capabilities": [
      () => {
        calls += 1;
        return json(503, { error: { code: "gateway_draining" } }, { "Retry-After": "0" });
      },
      () => {
        calls += 1;
        return json(200, { ok: true });
      },
    ],
  });

  await requestJson({ path: "/v1/capabilities" });
  assert.equal(calls, 2, "esperava a falha e exatamente uma repetição");
});

test("GET em 503 persistente falha depois de UMA repetição — nunca em laço", async () => {
  await setup();
  installScriptedFetch({
    "/v1/capabilities": [() => json(503, { error: { code: "gateway_draining" } }, { "Retry-After": "0" })],
  });

  await assert.rejects(() => requestJson({ path: "/v1/capabilities" }));
  assert.equal(requestsTo("/v1/capabilities"), 2, "duas tentativas no total, não mais");
});

test("POST em 503 NÃO é repetido — repetir duplicaria o efeito", async () => {
  await setup();
  installScriptedFetch({
    "/v1/runs": [() => json(503, { error: { code: "gateway_draining" } }, { "Retry-After": "0" })],
  });

  await assert.rejects(() => requestJson({ method: "POST", path: "/v1/runs", body: { input: "oi" } }));
  assert.equal(requestsTo("/v1/runs"), 1, "um POST recusado é um POST só");
});

test("ECONNREFUSED descarta o endereço memoizado e repete UMA vez (R10)", async () => {
  await setup({ apiUrl: undefined });
  let attempts = 0;
  captured.length = 0;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    captured.push({ url, headers: new Headers(init?.headers) });
    if (new URL(url).pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", platform: "hermes-agent", version: "0.20.4" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    attempts += 1;
    if (attempts === 1) throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;

  await requestJson({ path: "/v1/capabilities" });

  assert.equal(attempts, 2, "esperava a recusa e uma nova tentativa");
  // A repetição só vale se o endereço tiver sido resolvido de novo: o gateway pode ter
  // reiniciado em outra porta, e repetir contra a porta morta seria repetir o erro.
  assert.ok(requestsTo("/health") >= 2, "a baseUrl memoizada não foi descartada");
});

/* ══════════════ 401 e a chave detectada (UX-SPEC §3.3) ══════════════ */

test("401 apaga a chave DETECTADA — a recuperação da §3.3 vale para todo comando", async () => {
  await setup({ apiServerKey: undefined });
  const { saveDetectedApiKey, readDetectedApiKey } = await import("../src/lib/storage.ts");
  await saveDetectedApiKey(FIXTURE_KEY);

  installScriptedFetch({
    "/v1/capabilities": [() => json(401, { error: { code: "gateway_auth_failed" } })],
  });

  await assert.rejects(() => requestJson({ path: "/v1/capabilities" }));
  assert.equal(await readDetectedApiKey(), undefined, "a chave detectada recusada continuou guardada");
});

test("401 NÃO apaga a preferência — ela é intenção explícita do usuário", async () => {
  await setup();
  const { saveDetectedApiKey, readDetectedApiKey } = await import("../src/lib/storage.ts");
  await saveDetectedApiKey("NAO_E_UMA_CHAVE_REAL_detectada");

  installScriptedFetch({
    "/v1/capabilities": [() => json(401, { error: { code: "gateway_auth_failed" } })],
  });

  await assert.rejects(() => requestJson({ path: "/v1/capabilities" }));
  // A requisição usou a PREFERÊNCIA (§3.3): apagar a detectada puniria a chave inocente —
  // era exatamente o laço em que a detecção automática se prendia.
  assert.equal(await readDetectedApiKey(), "NAO_E_UMA_CHAVE_REAL_detectada");
});

test("401 de uma validação com chave explícita não mexe no que está guardado (§3.5)", async () => {
  await setup({ apiServerKey: undefined });
  const { saveDetectedApiKey, readDetectedApiKey } = await import("../src/lib/storage.ts");
  await saveDetectedApiKey(FIXTURE_KEY);

  installScriptedFetch({
    "/v1/models": [() => json(401, { error: { code: "gateway_auth_failed" } })],
  });

  await assert.rejects(() => requestJson({ path: "/v1/models", apiKey: "NAO_E_UMA_CHAVE_REAL_candidata" }));
  assert.equal(await readDetectedApiKey(), FIXTURE_KEY, "a chave guardada foi apagada por um teste de outra chave");
  assert.equal(lastRequest().headers.get("Authorization"), "Bearer NAO_E_UMA_CHAVE_REAL_candidata");
});

test("segurança: depois de uma requisição autenticada, a chave some de qualquer detalhe técnico", async () => {
  await setup();
  installFetchDouble();
  await requestJson({ path: "/v1/capabilities" });

  const { sanitizeTechnical, REDACTED_SECRET } = await import("../src/lib/errors.ts");
  // Eco CRU do valor, sem `Bearer` e sem `chave=`: nenhuma heurística pega isto.
  const limpo = sanitizeTechnical(`o servidor devolveu: unknown credential ${FIXTURE_KEY}`);

  assert.ok(!limpo.includes(FIXTURE_KEY), `sobrou a chave em: ${limpo}`);
  assert.ok(limpo.includes(REDACTED_SECRET));
});

/* ══════════════ Título da conversa (UX-SPEC §0.3) ══════════════ */

test("o título é a pergunta cortada em 60 caracteres, SEM sufixo aleatório", () => {
  const curto = conversationTitle("Resuma este relatório");
  assert.equal(curto, "Resuma este relatório");

  const longo = conversationTitle("a".repeat(200));
  assert.equal(longo.length, 60);

  // O sufixo hexadecimal aparecia na lista do Raycast, na metadata `Conversa` e nos
  // Recentes do Hermes Desktop: "Resuma este relatório · a3f9c1".
  assert.doesNotMatch(curto, /·/);
  assert.doesNotMatch(longo, /·/);
});

test("GET em 503 abortado durante Retry-After não faz a segunda chamada", async () => {
  await setup();
  const controller = new AbortController();
  let calls = 0;
  let firstAttemptResolve!: () => void;
  const firstAttempt = new Promise<void>((resolve) => {
    firstAttemptResolve = resolve;
  });
  installScriptedFetch({
    "/v1/capabilities": [
      () => {
        calls += 1;
        firstAttemptResolve();
        return json(503, { error: { code: "gateway_draining" } }, { "Retry-After": "1" });
      },
      () => {
        calls += 1;
        return json(200, { ok: true });
      },
    ],
  });

  const pending = requestJson({ path: "/v1/capabilities", signal: controller.signal });
  await firstAttempt;
  // Deixe a resposta 503 ser mapeada e o atraso Retry-After instalar o listener.
  await new Promise<void>((resolve) => setTimeout(resolve, 25));
  assert.equal(calls, 1, "o retry ainda deve estar aguardando Retry-After");
  controller.abort();

  await assert.rejects(pending, (error: unknown) => isAbort(error));
  assert.equal(calls, 1, "o abort durante Retry-After não pode chamar fetch novamente");
});

test("o título nunca é vazio e normaliza controles e espaços", () => {
  assert.equal(conversationTitle("   "), "Raycast conversation");
  assert.equal(conversationTitle("linha\numa\tdois"), "linha uma dois");
});

test("a colisão de título anda ` (2)`, ` (3)` e depois desiste do título", () => {
  const base = "Resuma este relatório";
  assert.equal(conversationTitleAttempt(base, 0), base);
  assert.equal(conversationTitleAttempt(base, 1), "Resuma este relatório (2)");
  assert.equal(conversationTitleAttempt(base, 2), "Resuma este relatório (3)");
  // §0.3: "na terceira falha, criar SEM título".
  assert.equal(conversationTitleAttempt(base, 3), undefined);
});

test("o sufixo de colisão cabe no limite de 60, cortando a base e não o sufixo", () => {
  const titulo = conversationTitleAttempt("b".repeat(200), 1);
  assert.ok(titulo !== undefined);
  assert.ok(titulo.length <= 60, `${titulo.length} caracteres`);
  assert.ok(titulo.endsWith(" (2)"));
});

test("startConversation reage a `invalid_title` com ` (2)`, ` (3)` e por fim sem título", async () => {
  await setup();
  const titulos: (string | undefined)[] = [];
  let criada = false;

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const path = new URL(url).pathname;

    if (path === "/health") {
      return json(200, { status: "ok", platform: "hermes-agent", version: "0.20.4" });
    }
    if (path === "/api/sessions") {
      const body = JSON.parse(String(init?.body ?? "{}")) as { title?: string; id?: string };
      titulos.push(body.title);
      // As três primeiras tentativas colidem; a quarta vai sem título e passa.
      if (body.title !== undefined) return json(400, { error: { code: "invalid_title" } });
      criada = true;
      return json(201, { session: { id: body.id, title: null, source: "desktop" } });
    }
    if (path === "/v1/runs") return json(202, { run_id: "run_abc", status: "started" });
    return json(200, { ok: true });
  }) as typeof globalThis.fetch;

  const started = await startConversation({ input: "Resuma este relatório" });

  assert.ok(criada, "a conversa nunca chegou a ser criada");
  assert.deepEqual(titulos, [
    "Resuma este relatório",
    "Resuma este relatório (2)",
    "Resuma este relatório (3)",
    undefined,
  ]);
  assert.equal(started.runId, "run_abc");
  assert.equal(started.title, undefined);
});

test("startConversation retenta o ID uma vez em 409 `session_exists` (R7)", async () => {
  await setup();
  const ids: (string | undefined)[] = [];

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const path = new URL(url).pathname;

    if (path === "/health") {
      return json(200, { status: "ok", platform: "hermes-agent", version: "0.20.4" });
    }
    if (path === "/api/sessions") {
      const body = JSON.parse(String(init?.body ?? "{}")) as { title?: string; id?: string };
      ids.push(body.id);
      if (ids.length === 1) return json(409, { error: { code: "session_exists" } });
      return json(201, { session: { id: body.id, title: body.title ?? null, source: "desktop" } });
    }
    if (path === "/v1/runs") return json(202, { run_id: "run_xyz", status: "started" });
    return json(200, { ok: true });
  }) as typeof globalThis.fetch;

  const started = await startConversation({ input: "Outra pergunta" });

  assert.equal(ids.length, 2, "o 409 de id duplicado deve gerar exatamente uma nova tentativa");
  assert.notEqual(ids[0], ids[1], "a segunda tentativa repetiu o mesmo id");
  assert.equal(started.title, "Outra pergunta", "o título não devia mudar por causa do id");
});
