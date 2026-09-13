/**
 * Testes de `src/lib/storage.ts` — exigidos por `ARCHITECTURE.md` §12.2 e até aqui
 * inexistentes.
 *
 * Por que este arquivo importa mais do que parece: **não existe `GET /v1/runs`**. O índice
 * local é o ÚNICO registro de que uma execução aconteceu. Uma entrada perdida aqui é uma
 * tarefa que o usuário não reencontra por caminho nenhum — nem na lista, nem pelo resultado
 * gravado. Por isso o que se testa é a perda: o teto de 20, a poda de 7 dias e a corrida de
 * escritas concorrentes sobre a mesma chave do LocalStorage.
 *
 * `@raycast/api` não tem runtime fora do host do Raycast; `module-hooks.mjs` redireciona o
 * especificador para o duplo em memória, que é quem implementa `LocalStorage` e `Cache`.
 *
 * Executar: `node --test tests/storage.test.ts`
 */

import test from "node:test";
import assert from "node:assert/strict";

import "./helpers/module-hooks.mjs";
import {
  Cache,
  LocalStorage,
  __localStorageSnapshot,
  __resetRaycastState,
  __setLocalStorageHooks,
} from "./helpers/raycast-api-stub.mjs";

const {
  CacheKeys,
  StorageKeys,
  cachedFetch,
  cacheRead,
  cacheWrite,
  forgetRun,
  listStoredRuns,
  loadRunResult,
  rememberRun,
  saveRunResult,
  updateStoredRun,
  updateStoredRuns,
  listQueuedTurns,
  rememberQueuedTurn,
  removeQueuedTurn,
  StoragePersistenceError,
  saveApprovalRequest,
  loadApprovalRequest,
  clearApprovalRequest,
} = await import("../src/lib/storage.ts");

type StoredRun = Awaited<ReturnType<typeof listStoredRuns>>[number];

const DAY_MS = 24 * 60 * 60 * 1000;

function run(runId: string, overrides: Partial<StoredRun> = {}): StoredRun {
  return {
    runId,
    promptPreview: `pergunta ${runId}`,
    createdAt: Date.now(),
    lastKnownStatus: "running",
    baseUrl: "http://127.0.0.1:8642",
    ...overrides,
  };
}

/* ═══════════════════════ Teto de 20 e poda de 7 dias ═══════════════════════ */

test("o índice guarda no máximo 20 execuções, descartando as mais antigas", async () => {
  __resetRaycastState();
  for (let i = 0; i < 25; i++) await rememberRun(run(`run_${i}`, { lastKnownStatus: "completed" }));

  const runs = await listStoredRuns();
  assert.equal(runs.length, 20);
  // `rememberRun` põe a nova na frente: a que sobrevive é a última gravada.
  assert.equal(runs[0]?.runId, "run_24");
  assert.ok(!runs.some((r) => r.runId === "run_4"), "uma execução antiga sobreviveu ao teto");
});

test("regravar o mesmo run_id atualiza a entrada em vez de duplicar", async () => {
  __resetRaycastState();
  await rememberRun(run("run_a", { promptPreview: "primeira" }));
  await rememberRun(run("run_b"));
  await rememberRun(run("run_a", { promptPreview: "segunda" }));

  const runs = await listStoredRuns();
  assert.equal(runs.filter((r) => r.runId === "run_a").length, 1);
  assert.equal(runs[0]?.promptPreview, "segunda");
});

test("execuções com mais de 7 dias somem da leitura", async () => {
  __resetRaycastState();
  await rememberRun(run("recente", { createdAt: Date.now() - 6 * DAY_MS }));
  await rememberRun(run("vencida", { createdAt: Date.now() - 8 * DAY_MS, lastKnownStatus: "completed" }));

  const ids = (await listStoredRuns()).map((r) => r.runId);
  assert.deepEqual(ids.sort(), ["recente"]);
});

test("a poda de 7 dias não deixa o registro vencido ressuscitar numa gravação seguinte", async () => {
  __resetRaycastState();
  await rememberRun(run("vencida", { createdAt: Date.now() - 8 * DAY_MS, lastKnownStatus: "completed" }));
  await rememberRun(run("nova"));

  const bruto = __localStorageSnapshot()[StorageKeys.runIndex] ?? "[]";
  assert.ok(!bruto.includes("vencida"), "o registro vencido foi reescrito no índice");
});

/* ═══════════════════════ Escrita concorrente ═══════════════════════ */

test("updateStoredRuns aplica todas as correções de um ciclo numa gravação só", async () => {
  __resetRaycastState();
  await rememberRun(run("r1"));
  await rememberRun(run("r2"));
  await rememberRun(run("r3"));

  await updateStoredRuns(
    new Map([
      ["r1", { lastKnownStatus: "completed" }],
      ["r2", { expired: true }],
      ["r3", { lastKnownStatus: "failed", lastKnownEvent: "run.failed" }],
    ]),
  );

  const byId = new Map((await listStoredRuns()).map((r) => [r.runId, r]));
  assert.equal(byId.get("r1")?.lastKnownStatus, "completed");
  assert.equal(byId.get("r2")?.expired, true);
  assert.equal(byId.get("r3")?.lastKnownEvent, "run.failed");
});

test("um run_id ausente do índice é ignorado, sem criar entrada fantasma", async () => {
  __resetRaycastState();
  await rememberRun(run("r1"));

  await updateStoredRuns(new Map([["r_inexistente", { lastKnownStatus: "completed" }]]));

  const runs = await listStoredRuns();
  assert.equal(runs.length, 1);
  assert.equal(runs[0]?.runId, "r1");
});

/**
 * A corrida que motivou `updateStoredRuns`: `updateStoredRun` é read-modify-write sobre UMA
 * chave. Disparadas em paralelo (era o que o ciclo de `Execuções do Hermes` fazia, uma por
 * execução), todas leem o mesmo array de partida e a última a gravar apaga as demais.
 * Como a linha já ficou terminal em memória, o ciclo seguinte não a reconsulta e o estado
 * perdido nunca é reparado.
 */
test("um ciclo de polling não perde atualizações por escrita concorrente", async () => {
  __resetRaycastState();
  const ids = ["r1", "r2", "r3", "r4", "r5"];
  for (const id of ids) await rememberRun(run(id));

  const patches = new Map(ids.map((id) => [id, { lastKnownStatus: `terminou_${id}` }]));
  await updateStoredRuns(patches);

  const byId = new Map((await listStoredRuns()).map((r) => [r.runId, r]));
  for (const id of ids) {
    assert.equal(byId.get(id)?.lastKnownStatus, `terminou_${id}`, `a atualização de ${id} se perdeu`);
  }
});

test("updateStoredRun continua valendo para a correção avulsa", async () => {
  __resetRaycastState();
  await rememberRun(run("r1"));
  await updateStoredRun("r1", { lastKnownStatus: "cancelled" });

  assert.equal((await listStoredRuns())[0]?.lastKnownStatus, "cancelled");
});

/* ═══════════════ `expired`: o 404 precisa sobreviver ao fechamento ═══════════════ */

/**
 * O 404 é permanente (o servidor descartou o registro). Sem gravá-lo, `lastKnownStatus`
 * fica congelado em `running` por até 7 dias e o banner "Você tem N tarefas em andamento
 * no Hermes" de `Perguntar ao Hermes` mente sobre uma execução que sumiu.
 */
test("a condição `expired` sobrevive à releitura do índice", async () => {
  __resetRaycastState();
  await rememberRun(run("r1", { lastKnownStatus: "running" }));
  await updateStoredRun("r1", { expired: true });

  const stored = (await listStoredRuns())[0];
  assert.equal(stored?.expired, true);
  assert.equal(stored?.lastKnownStatus, "running", "`expired` é condição, não estado (§4.3)");
});

test("forgetRun apaga a linha, a aprovação e o resultado gravados", async () => {
  __resetRaycastState();
  await rememberRun(run("r1"));
  await saveRunResult({ runId: "r1", status: "completed", output: "resposta", savedAt: Date.now() });

  await forgetRun("r1");

  assert.equal((await listStoredRuns()).length, 0);
  assert.equal(await loadRunResult("r1"), undefined);
});

test("o resultado gravado é truncado — o índice não é um arquivo de transcrições", async () => {
  __resetRaycastState();
  await saveRunResult({ runId: "r1", status: "completed", output: "x".repeat(9000), savedAt: Date.now() });

  assert.equal((await loadRunResult("r1"))?.output?.length, 4000);
});

/* ═══════════════════════ Cache com TTL ═══════════════════════ */

test("cacheRead devolve o valor dentro do TTL e nada depois dele", () => {
  __resetRaycastState();
  const agora = Date.now();
  const real = Date.now;
  try {
    Date.now = () => agora;
    cacheWrite(CacheKeys.modelOptions, { providers: [] });

    Date.now = () => agora + 1_000;
    assert.deepEqual(cacheRead(CacheKeys.modelOptions, 10_000), { providers: [] });

    Date.now = () => agora + 20_000;
    assert.equal(cacheRead(CacheKeys.modelOptions, 10_000), undefined, "o valor vencido foi servido");
  } finally {
    Date.now = real;
  }
});

test("um envelope corrompido no Cache não derruba a leitura", () => {
  __resetRaycastState();
  cacheWrite(CacheKeys.capabilities, { features: {} });
  // Simula um arquivo truncado em disco (o Cache é um arquivo simples, não um banco).
  new Cache({ namespace: "hermes" }).set(CacheKeys.capabilities, "{ isto não é json");

  assert.equal(cacheRead(CacheKeys.capabilities, 60_000), undefined);
});

test("cachedFetch compartilha loader em voo por chave e permite nova tentativa após falha", async () => {
  __resetRaycastState();
  let calls = 0;
  let release!: () => void;
  const suspended = new Promise<void>((resolve) => {
    release = resolve;
  });
  const loader = async (): Promise<{ ok: boolean }> => {
    calls += 1;
    await suspended;
    return { ok: true };
  };

  const first = cachedFetch("dedupe", 60_000, loader);
  const second = cachedFetch("dedupe", 60_000, loader);
  await Promise.resolve();
  assert.equal(calls, 1, "duas telas concorrentes iniciaram loaders duplicados");
  release();
  assert.deepEqual(await Promise.all([first, second]), [{ ok: true }, { ok: true }]);

  let failedCalls = 0;
  await assert.rejects(
    () =>
      cachedFetch("retry-after-failure", 60_000, async () => {
        failedCalls += 1;
        throw new Error("falha transitória");
      }),
    /falha transitória/,
  );
  assert.deepEqual(
    await cachedFetch("retry-after-failure", 60_000, async () => {
      failedCalls += 1;
      return { ok: true };
    }),
    { ok: true },
  );
  assert.equal(failedCalls, 2, "a falha ficou presa no cache de voo");
});

test("cachedFetch registra o voo antes de um loader reentrante", async () => {
  __resetRaycastState();
  let calls = 0;
  let reentrant: Promise<{ ok: boolean }> | undefined;
  const loader = async (): Promise<{ ok: boolean }> => {
    calls += 1;
    if (reentrant === undefined) reentrant = cachedFetch("reentrant", 60_000, loader);
    return { ok: true };
  };

  const result = await cachedFetch("reentrant", 60_000, loader);
  assert.equal(calls, 1, "a reentrada síncrona iniciou um segundo loader");
  assert.deepEqual(await reentrant, result, "a reentrada não compartilhou a Promise em voo");
});

test("fixture antiga migra para schema V2 sem perder a run", async () => {
  __resetRaycastState();
  await LocalStorage.setItem(
    StorageKeys.runIndex,
    JSON.stringify([
      {
        runId: "old",
        sessionId: "s1",
        promptPreview: "pergunta antiga",
        createdAt: Date.now(),
        lastKnownStatus: "running",
        baseUrl: "http://127.0.0.1:8642",
      },
    ]),
  );

  const [stored] = await listStoredRuns();
  assert.equal(stored?.schemaVersion, 2);
  assert.equal(stored?.status, "running");
  assert.equal(stored?.transportPhase, "reconciling");
  assert.equal(
    (JSON.parse(__localStorageSnapshot()[StorageKeys.runIndex] ?? "[]")[0] as { schemaVersion?: number }).schemaVersion,
    2,
  );
});

test("retenção preserva todas as runs não terminais mesmo além do limite antigo", async () => {
  __resetRaycastState();
  for (let i = 0; i < 30; i++) {
    await rememberRun(run(`active_${i}`, { lastKnownStatus: "running" }));
  }
  assert.equal((await listStoredRuns()).length, 30);
});

test("mutex por chave não perde patches concorrentes", async () => {
  __resetRaycastState();
  await rememberRun(run("r1"));
  await rememberRun(run("r2"));
  let writes = 0;
  __setLocalStorageHooks({
    setItem: async () => {
      writes += 1;
      await Promise.resolve();
    },
  });
  await Promise.all([
    updateStoredRun("r1", { lastKnownStatus: "completed" }),
    updateStoredRun("r2", { lastKnownStatus: "failed" }),
  ]);
  __setLocalStorageHooks({});
  const byId = new Map((await listStoredRuns()).map((stored) => [stored.runId, stored]));
  assert.equal(byId.get("r1")?.status, "completed");
  assert.equal(byId.get("r2")?.status, "failed");
  assert.ok(writes >= 2);
});

test("fila local é idempotente e restaura por conversa", async () => {
  __resetRaycastState();
  await rememberQueuedTurn({ schemaVersion: 1, id: "t1", sessionId: "s1", message: "uma", createdAt: 1 });
  await rememberQueuedTurn({ schemaVersion: 1, id: "t1", sessionId: "s1", message: "uma corrigida", createdAt: 2 });
  await rememberQueuedTurn({ schemaVersion: 1, id: "t2", sessionId: "s2", message: "outra", createdAt: 3 });
  assert.deepEqual(
    (await listQueuedTurns("s1")).map((item) => item.message),
    ["uma corrigida"],
  );
  await removeQueuedTurn("t1");
  assert.deepEqual(await listQueuedTurns("s1"), []);
});

test("gravação aceita falha transitória e tenta novamente sem duplicar", async () => {
  __resetRaycastState();
  let failures = 0;
  __setLocalStorageHooks({
    setItem: async () => {
      if (failures < 2) {
        failures += 1;
        throw new Error("disco ocupado");
      }
    },
  });
  await rememberRun(run("retry"));
  __setLocalStorageHooks({});
  assert.equal(failures, 2);
  assert.equal((await listStoredRuns()).filter((stored) => stored.runId === "retry").length, 1);
});

test("falha persistente de LocalStorage é visível e não finge que a run não existe", async () => {
  __resetRaycastState();
  __setLocalStorageHooks({
    setItem: async () => {
      throw new Error("sem espaço");
    },
  });
  await assert.rejects(() => rememberRun(run("lost")), StoragePersistenceError);
  __setLocalStorageHooks({});
});

test("marcas de persistência pendente não se sobrescrevem entre runs", async () => {
  __resetRaycastState();
  __setLocalStorageHooks({
    setItem: async (key: string) => {
      if (key === StorageKeys.runIndex) throw new Error("índice indisponível");
    },
  });
  await assert.rejects(() => rememberRun(run("lost_1")), StoragePersistenceError);
  await assert.rejects(() => rememberRun(run("lost_2")), StoragePersistenceError);
  __setLocalStorageHooks({});

  await rememberRun(run("saved"));
  const pending = JSON.parse(__localStorageSnapshot()[StorageKeys.pendingRunWrites] ?? "{}") as Record<string, number>;
  assert.deepEqual(Object.keys(pending).sort(), ["lost_1", "lost_2"]);
});

test("aprovação: gravar e limpar no mesmo tique não deixa registro órfão", async () => {
  __resetRaycastState();
  // Aprovação automática: `approval.request` e `approval.responded` chegam no mesmo burst
  // do stream. O `setItem` é lento (retryStorage + IPC) e o `removeItem` é rápido — sem
  // serialização por chave, a gravação pousa DEPOIS do apagamento e sobrevive órfã.
  __setLocalStorageHooks({
    setItem: () => new Promise((resolve) => setTimeout(resolve, 20)),
  });

  const save = saveApprovalRequest({ runId: "run-1", choices: ["once", "deny"], receivedAt: Date.now() });
  const clear = clearApprovalRequest("run-1");
  await Promise.all([save, clear]);

  __setLocalStorageHooks({});
  assert.equal(await loadApprovalRequest("run-1"), undefined);
  assert.equal(Object.keys(__localStorageSnapshot()).length, 0);
});

test("aprovação: limpar a chave de uma run não apaga a de outra", async () => {
  __resetRaycastState();
  await saveApprovalRequest({ runId: "run-a", choices: ["deny"], receivedAt: 1 });
  await saveApprovalRequest({ runId: "run-b", choices: ["deny"], receivedAt: 2 });

  await clearApprovalRequest("run-a");

  assert.equal(await loadApprovalRequest("run-a"), undefined);
  assert.equal((await loadApprovalRequest("run-b"))?.receivedAt, 2);
});
