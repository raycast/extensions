/**
 * Armazenamento local da extensão (docs/ARCHITECTURE.md §9).
 *
 * Divisão de responsabilidades:
 *   LocalStorage — banco criptografado do Raycast, durável e assíncrono. Guarda o que
 *                  o servidor NÃO sabe devolver: o índice de execuções (não existe
 *                  `GET /v1/runs`), as aprovações recebidas pelo stream (não existe rota
 *                  que liste aprovações pendentes), a chave detectada e o endpoint resolvido.
 *   Cache        — arquivo simples em disco, síncrono, LRU. Só dados públicos e
 *                  descartáveis, sempre com TTL: capabilities, modelos, skills, toolsets.
 *
 * O QUE NUNCA É GUARDADO, EM LUGAR NENHUM:
 *   - transcrições completas (`GET /api/sessions/{id}/messages`);
 *   - conteúdo de mensagens, previews longos, argumentos de ferramentas;
 *   - a `API_SERVER_KEY` no `Cache` (só no LocalStorage, e só quando detectada).
 * A única exceção deliberada é o resultado final de uma execução que o próprio usuário
 * disparou no Raycast, truncado, porque o servidor descarta o status terminal em 1 h.
 */

import { Cache, LocalStorage } from "@raycast/api";

export const StorageKeys = {
  /** {baseUrl, version, source, gatewayPid, gatewayStartTime, checkedAt} — 12 h + pid. */
  endpointCache: "hermes.endpoint.v1",
  /**
   * Chave detectada pela ação explícita "Detectar configuração automaticamente".
   * A preferência `apiServerKey` sempre vence sobre este valor (UX-SPEC §3.3).
   */
  detectedApiKey: "hermes.detectedKey.v1",
  lastSessionId: "hermes.lastSessionId.v1",
  /** {provider?, model?} — ação "Usar como modelo padrão". Vence a preferência. */
  defaultModel: "hermes.defaultModel.v1",
  /** {provider?, model?} — ação "Usar só na próxima pergunta". Apagar após consumir. */
  nextTurnModel: "hermes.nextTurnModel.v1",
  runIndex: "hermes.runs.v1",
  queuedTurns: "hermes.queuedTurns.v1",
  pendingRunWrites: "hermes.pendingRunWrites.v1",
  approvalPrefix: "hermes.approval.v1.",
  runResultPrefix: "hermes.runResult.v1.",
} as const;

/* ───────────────── LocalStorage (durável, assíncrono) ───────────────── */

const STORAGE_RETRY_DELAYS_MS = [0, 10, 50] as const;

async function retryStorage<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const delay of STORAGE_RETRY_DELAYS_MS) {
    if (delay > 0) await new Promise<void>((resolve) => setTimeout(resolve, delay));
    try {
      return await operation();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not reach the local storage.");
}

export class StoragePersistenceError extends Error {
  readonly userMessage =
    "I could not save the local state of this task. Try again and keep Raycast open until it confirms.";
  constructor(cause: unknown) {
    super("The Raycast local storage refused a write after the allowed retries.", { cause });
    this.name = "StoragePersistenceError";
  }
}

export async function readJson<TValue>(key: string): Promise<TValue | undefined> {
  const raw = await retryStorage(() => LocalStorage.getItem<string>(key));
  if (typeof raw !== "string") return undefined;
  try {
    return JSON.parse(raw) as TValue;
  } catch {
    await retryStorage(() => LocalStorage.removeItem(key));
    return undefined;
  }
}

export async function writeJson<TValue>(key: string, value: TValue | undefined): Promise<void> {
  try {
    if (value === undefined) {
      await retryStorage(() => LocalStorage.removeItem(key));
      return;
    }
    await retryStorage(() => LocalStorage.setItem(key, JSON.stringify(value)));
  } catch (error) {
    throw new StoragePersistenceError(error);
  }
}

/* ───────────────────────── Chave detectada ─────────────────────────── */

/**
 * SEGURANÇA: as três funções abaixo são o único lugar da extensão que persiste a
 * `API_SERVER_KEY`. O valor vai para o LocalStorage (criptografado) e nunca para o
 * `Cache`, para arquivo, para log, para toast, para erro ou para o clipboard.
 * Gravar só a partir da ação explícita do usuário (UX-SPEC §3.1) — nunca em background.
 */
export async function saveDetectedApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (trimmed === "") return;
  await LocalStorage.setItem(StorageKeys.detectedApiKey, trimmed);
}

export async function readDetectedApiKey(): Promise<string | undefined> {
  const stored = await LocalStorage.getItem<string>(StorageKeys.detectedApiKey);
  if (typeof stored !== "string" || stored.trim() === "") return undefined;
  return stored.trim();
}

/** Ação "Esquecer a chave detectada" e resposta automática a 401 `gateway_auth_failed`. */
export function forgetDetectedApiKey(): Promise<void> {
  return LocalStorage.removeItem(StorageKeys.detectedApiKey);
}

/* ───────────────────── Cache (síncrono, LRU 10 MB) ──────────────────── */

const cache = new Cache({ namespace: "hermes" });
const inFlightCacheFetches = new Map<string, Promise<unknown>>();

interface CacheEnvelope<TValue> {
  v: 1;
  at: number;
  data: TValue;
}

export function cacheRead<TValue>(key: string, maxAgeMs: number): TValue | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;
  try {
    const envelope = JSON.parse(raw) as CacheEnvelope<TValue>;
    // `Math.abs`: um relógio que anda para trás deixa `at` no futuro, e a subtração crua ficaria
    // negativa para sempre — a entrada nunca venceria até o tempo real alcançá-la.
    if (envelope.v !== 1 || Math.abs(Date.now() - envelope.at) > maxAgeMs) return undefined;
    return envelope.data;
  } catch {
    cache.remove(key);
    return undefined;
  }
}

export function cacheWrite<TValue>(key: string, data: TValue): void {
  cache.set(key, JSON.stringify({ v: 1, at: Date.now(), data } satisfies CacheEnvelope<TValue>));
}

export const CacheKeys = {
  capabilities: "capabilities",
  modelOptions: "modelOptions",
  skills: "skills",
  toolsets: "toolsets",
  sessionsFirstPage: "sessionsFirstPage",
} as const;

export const CacheTtl = {
  capabilities: 5 * 60_000,
  modelOptions: 10 * 60_000,
  skills: 5 * 60_000,
  /**
   * Endpoint lento E perigoso: o handler pode travar o Hermes inteiro por ~8 s. Dez minutos
   * é o meio-termo medido: raro o bastante para não punir o servidor, curto o bastante para
   * a lista não mentir depois de o usuário configurar um provedor no Hermes Desktop.
   */
  toolsets: 10 * 60_000,
  /** Só para pintura instantânea da lista; sempre revalidar depois. */
  sessionsFirstPage: 30_000,
} as const;

/** Cache-primeiro simples: devolve o valor fresco do disco ou busca e grava. */
export async function cachedFetch<TValue>(key: string, ttlMs: number, loader: () => Promise<TValue>): Promise<TValue> {
  const hit = cacheRead<TValue>(key, ttlMs);
  if (hit !== undefined) return hit;

  const inFlight = inFlightCacheFetches.get(key);
  if (inFlight !== undefined) return inFlight as Promise<TValue>;

  const request = Promise.resolve()
    .then(() => loader())
    .then((fresh) => {
      cacheWrite(key, fresh);
      return fresh;
    });
  inFlightCacheFetches.set(key, request);
  void request
    .finally(() => {
      if (inFlightCacheFetches.get(key) === request) inFlightCacheFetches.delete(key);
    })
    .catch(() => undefined);
  return request;
}

/* ─────────────────────── Índice de execuções ────────────────────────── */

/**
 * Não existe `GET /v1/runs`: quem não guardar o `run_id` perde a execução para sempre.
 * Por isso este índice é gravado ANTES de renderizar qualquer coisa após o 202.
 */
export interface StoredRun {
  schemaVersion?: 2;
  runId: string;
  turnId?: string;
  sessionId?: string;
  /** Prompt truncado em 200 chars, só para identificar o item na lista. */
  promptPreview: string;
  createdAt: number;
  lastKnownStatus: string;
  status?: string;
  transportPhase?: import("./conversation-lifecycle").TransportPhase;
  updatedAt?: number;
  lastKnownEvent?: string;
  baseUrl: string;
  /**
   * `GET /v1/runs/{id}` devolveu 404: o gateway reiniciou ou passou o TTL de 1 h.
   * É CONDIÇÃO, nunca o estado `Failed` (UX-SPEC §4.3) — e precisa morar no índice,
   * porque `lastKnownStatus` fica congelado em `queued`/`running` para sempre e o
   * banner "Você tem N tarefas em andamento" continuaria contando a execução por
   * até 7 dias depois de ela ter sumido do servidor.
   */
  expired?: boolean;
}

const MAX_STORED_TERMINAL_RUNS = 20;
const RUN_INDEX_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const TERMINAL_STATUSES = new Set(["completed", "cancelled", "failed"]);
const storageLocks = new Map<string, Promise<void>>();

async function withStorageLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = storageLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current);
  storageLocks.set(key, queued);
  await previous;
  try {
    return await task();
  } finally {
    release();
    if (storageLocks.get(key) === queued) storageLocks.delete(key);
  }
}

function transportPhaseFor(status: string): import("./conversation-lifecycle").TransportPhase {
  if (status === "queued") return "accepted";
  return "reconciling";
}

function normalizeStoredRun(raw: StoredRun): StoredRun {
  const status = raw.status ?? raw.lastKnownStatus;
  return {
    ...raw,
    schemaVersion: 2,
    status,
    lastKnownStatus: raw.lastKnownStatus ?? status,
    transportPhase: raw.transportPhase ?? transportPhaseFor(status),
    updatedAt: raw.updatedAt ?? raw.createdAt,
  };
}

function retainRuns(runs: StoredRun[]): StoredRun[] {
  const cutoff = Date.now() - RUN_INDEX_MAX_AGE_MS;
  const active = runs.filter((run) => !TERMINAL_STATUSES.has(run.status ?? run.lastKnownStatus));
  const terminal = runs
    .filter((run) => run.createdAt >= cutoff)
    .filter((run) => TERMINAL_STATUSES.has(run.status ?? run.lastKnownStatus))
    .slice(0, MAX_STORED_TERMINAL_RUNS);
  return [...active, ...terminal];
}

async function readRunIndex(): Promise<StoredRun[]> {
  const raw = (await readJson<unknown>(StorageKeys.runIndex)) ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is StoredRun => typeof entry === "object" && entry !== null).map(normalizeStoredRun);
}

export async function listStoredRuns(): Promise<StoredRun[]> {
  return withStorageLock(StorageKeys.runIndex, async () => {
    const raw = (await readJson<unknown>(StorageKeys.runIndex)) ?? [];
    const needsMigration =
      !Array.isArray(raw) ||
      raw.some(
        (entry) =>
          typeof entry !== "object" ||
          entry === null ||
          (entry as { schemaVersion?: unknown }).schemaVersion !== 2 ||
          (entry as { transportPhase?: unknown }).transportPhase === undefined,
      );
    const runs = await readRunIndex();
    const retained = retainRuns(runs);
    if (needsMigration || JSON.stringify(runs) !== JSON.stringify(retained))
      await writeJson(StorageKeys.runIndex, retained);
    return retained;
  });
}

export async function rememberRun(run: StoredRun): Promise<void> {
  await withStorageLock(StorageKeys.runIndex, async () => {
    const normalized = normalizeStoredRun(run);
    const runs = await readRunIndex();
    const next = retainRuns([normalized, ...runs.filter((r) => r.runId !== normalized.runId)]);
    try {
      await writeJson(StorageKeys.runIndex, next);
      const pending = (await readJson<Record<string, number>>(StorageKeys.pendingRunWrites)) ?? {};
      delete pending[normalized.runId];
      await writeJson(StorageKeys.pendingRunWrites, Object.keys(pending).length > 0 ? pending : undefined);
    } catch (error) {
      try {
        const pending = (await readJson<Record<string, number>>(StorageKeys.pendingRunWrites)) ?? {};
        pending[normalized.runId] = Date.now();
        await writeJson(StorageKeys.pendingRunWrites, pending);
      } catch {
        // A second failure is deliberately swallowed; the original error remains actionable.
      }
      throw error;
    }
  });
}

/**
 * Aplica VÁRIAS correções num único read-modify-write.
 *
 * Existe porque `updateStoredRun` é read-modify-write sobre uma chave só: N chamadas
 * concorrentes (o ciclo de `Execuções do Hermes` dispara uma por execução) leem o mesmo
 * array de partida e a última a gravar apaga as mudanças das outras. Como a linha já
 * está terminal em memória, o ciclo seguinte não a reconsulta e o `lastKnownStatus`
 * perdido nunca é reparado.
 */
export async function updateStoredRuns(patches: ReadonlyMap<string, Partial<StoredRun>>): Promise<void> {
  if (patches.size === 0) return;
  await withStorageLock(StorageKeys.runIndex, async () => {
    const runs = await readRunIndex();
    const updated = runs.map((run) => {
      const patch = patches.get(run.runId);
      if (patch === undefined) return run;
      const next = { ...run, ...patch };
      if (patch.status === undefined && patch.lastKnownStatus !== undefined) next.status = patch.lastKnownStatus;
      return { ...normalizeStoredRun(next), updatedAt: Date.now() };
    });
    await writeJson(StorageKeys.runIndex, retainRuns(updated));
  });
}

export function updateStoredRun(runId: string, patch: Partial<StoredRun>): Promise<void> {
  return updateStoredRuns(new Map([[runId, patch]]));
}

export async function forgetRun(runId: string): Promise<void> {
  await withStorageLock(StorageKeys.runIndex, async () => {
    const runs = await readRunIndex();
    await writeJson(
      StorageKeys.runIndex,
      runs.filter((run) => run.runId !== runId),
    );
  });
  await clearApprovalRequest(runId);
  await retryStorage(() => LocalStorage.removeItem(StorageKeys.runResultPrefix + runId));
}

/* ───────────────────────────── Fila local ───────────────────────────── */

export interface StoredQueuedTurnV1 {
  schemaVersion: 1;
  id: string;
  sessionId?: string;
  message: string;
  createdAt: number;
}

export async function listQueuedTurns(sessionId?: string): Promise<StoredQueuedTurnV1[]> {
  const all = (await readJson<StoredQueuedTurnV1[]>(StorageKeys.queuedTurns)) ?? [];
  return all.filter((item) => item.sessionId === sessionId);
}

export async function rememberQueuedTurn(turn: StoredQueuedTurnV1): Promise<void> {
  await withStorageLock(StorageKeys.queuedTurns, async () => {
    const all = (await readJson<StoredQueuedTurnV1[]>(StorageKeys.queuedTurns)) ?? [];
    await writeJson(StorageKeys.queuedTurns, [turn, ...all.filter((item) => item.id !== turn.id)]);
  });
}

export async function removeQueuedTurn(turnId: string): Promise<void> {
  await withStorageLock(StorageKeys.queuedTurns, async () => {
    const all = (await readJson<StoredQueuedTurnV1[]>(StorageKeys.queuedTurns)) ?? [];
    await writeJson(
      StorageKeys.queuedTurns,
      all.filter((item) => item.id !== turnId),
    );
  });
}

/* ──────────────────── Aprovações e resultados de run ────────────────── */

/**
 * Não existe endpoint que liste aprovações pendentes: todo `approval.request` recebido
 * pelo stream precisa ser gravado na hora, ou o usuário aprovaria às cegas.
 */
export interface StoredApproval {
  runId: string;
  command?: string;
  description?: string;
  /** Renderizar exatamente o array recebido; as opções variam por pedido. */
  choices: string[];
  requestId?: string;
  receivedAt: number;
  /**
   * Identificador do tipo de bloqueio. Vai CRU para a metadata da tela de aprovação
   * (UX-SPEC §7.2): é o único identificador confiável para quem for pedir suporte.
   */
  patternKey?: string;
  /** Decide o bloco de risco destrutivo vs sensível da UX-SPEC §7.3. */
  patternKeys?: string[];
  /** `true` quando o servidor já havia negado o pedido e só oferece `once`/`deny` (§7.3). */
  smartDenied?: boolean;
}

export function saveApprovalRequest(approval: StoredApproval): Promise<void> {
  const key = StorageKeys.approvalPrefix + approval.runId;
  return withStorageLock(key, () => writeJson(key, approval));
}

export function loadApprovalRequest(runId: string): Promise<StoredApproval | undefined> {
  const key = StorageKeys.approvalPrefix + runId;
  return withStorageLock(key, () => readJson<StoredApproval>(key));
}

export function clearApprovalRequest(runId: string): Promise<void> {
  const key = StorageKeys.approvalPrefix + runId;
  return withStorageLock(key, () => retryStorage(() => LocalStorage.removeItem(key)));
}

export interface StoredRunResult {
  runId: string;
  status: string;
  /** Truncado em 4000 chars na gravação. */
  output?: string;
  error?: string;
  savedAt: number;
}

export function saveRunResult(result: StoredRunResult): Promise<void> {
  return writeJson(StorageKeys.runResultPrefix + result.runId, {
    ...result,
    output: result.output?.slice(0, 4000),
    error: result.error?.slice(0, 2000),
  });
}

export function loadRunResult(runId: string): Promise<StoredRunResult | undefined> {
  return readJson<StoredRunResult>(StorageKeys.runResultPrefix + runId);
}

/* ─────────────────────────── Manutenção ─────────────────────────────── */

const APPROVAL_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const RESULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Poda aprovações e resultados vencidos. Barato: um `allItems` e alguns `removeItem`. */
export async function pruneLocalData(): Promise<void> {
  const all = await LocalStorage.allItems<Record<string, string>>();
  const now = Date.now();
  for (const [key, raw] of Object.entries(all)) {
    const isApproval = key.startsWith(StorageKeys.approvalPrefix);
    const isResult = key.startsWith(StorageKeys.runResultPrefix);
    if (!isApproval && !isResult) continue;
    try {
      const parsed = JSON.parse(raw) as { receivedAt?: number; savedAt?: number };
      const stamp = parsed.receivedAt ?? parsed.savedAt ?? 0;
      const maxAge = isApproval ? APPROVAL_MAX_AGE_MS : RESULT_MAX_AGE_MS;
      if (now - stamp > maxAge) await LocalStorage.removeItem(key);
    } catch {
      await LocalStorage.removeItem(key);
    }
  }
}

/** Ação "Limpar dados locais". Apaga a chave detectada também. Não toca em nada no Hermes. */
export async function clearAllLocalData(): Promise<void> {
  await LocalStorage.clear();
  cache.clear();
}
