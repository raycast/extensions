import { AUTH_TRANSPORTS, AuthTransport, Instance, TargetprocessError } from "./types";
import { apiUrl, applyAuth, QueryValue } from "./url";

export type Connectable = Pick<Instance, "baseUrl" | "token"> & { authTransport?: AuthTransport };

export interface FetchOptions {
  signal?: AbortSignal;
  /** Overridden in tests so they do not sleep. */
  retryDelayMs?: number;
}

export interface Fetched<T> {
  data: T;
  transport: AuthTransport;
}

export function transportOrder(known?: AuthTransport): AuthTransport[] {
  if (!known) return [...AUTH_TRANSPORTS];
  return [known, ...AUTH_TRANSPORTS.filter((transport) => transport !== known)];
}

const BACKOFF_MULTIPLIERS = [0, 1, 3];
const BASE_DELAY_MS = 300;

type RoundOutcome<T> =
  | { kind: "ok"; value: Fetched<T> }
  | { kind: "refused" }
  | { kind: "throttled" }
  | { kind: "unreachable"; cause: unknown }
  | { kind: "answered"; error: TargetprocessError };

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** `ray develop` prints this to the terminal. Never the query string, which carries the token. */
function noteAttempt(path: string, transport: AuthTransport, status: number, round: number, ms: number): void {
  const outcome = status === 0 ? "network failure" : `HTTP ${status}`;
  console.warn(`[targetprocess] ${path} via ${transport} round ${round + 1}: ${outcome} in ${ms}ms`);
}

function pause(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export function classifyStatus(status: number): TargetprocessError {
  if (status === 404) {
    return new TargetprocessError("not-found", "Targetprocess has no record with that ID.", status);
  }
  if (status >= 500) {
    return new TargetprocessError("server", "Targetprocess returned an error. Try again shortly.", status);
  }
  if (status === 400) {
    return new TargetprocessError("unexpected", "Targetprocess rejected the request.", status);
  }
  return new TargetprocessError("unexpected", `Targetprocess responded with HTTP ${status}.`, status);
}

/**
 * A known-good transport is retried alone for two rounds before re-negotiating.
 *
 * A 401 on a transport that worked moments ago is far more likely to be a blip than a change of
 * authentication scheme, and re-negotiating immediately turns one failed request into three - which
 * is how a transient failure surfaced as "Targetprocess rejected the token".
 */
export function retryPlan(known?: AuthTransport): AuthTransport[][] {
  if (!known) return [transportOrder(undefined), transportOrder(undefined), transportOrder(undefined)];
  return [[known], [known], transportOrder(known)];
}

async function attemptRound<T>(
  instance: Connectable,
  path: string,
  params: Record<string, QueryValue>,
  options: FetchOptions,
  transports: AuthTransport[],
  round: number,
): Promise<RoundOutcome<T>> {
  let unreachable = 0;
  let throttled = false;
  let lastCause: unknown;

  for (const transport of transports) {
    const url = apiUrl(instance.baseUrl, path, params);
    const headers = new Headers({ Accept: "application/json" });
    applyAuth(url, headers, instance.token, transport);

    const started = Date.now();
    let response: Response;
    try {
      response = await fetch(url, { headers, signal: options.signal });
    } catch (cause) {
      if (isAbort(cause)) throw cause;
      noteAttempt(path, transport, 0, round, Date.now() - started);
      unreachable += 1;
      lastCause = cause;
      continue;
    }

    if (response.status !== 200) noteAttempt(path, transport, response.status, round, Date.now() - started);

    if (response.status === 401 || response.status === 403) continue;
    if (response.status === 429) {
      throttled = true;
      continue;
    }
    if (!response.ok) return { kind: "answered", error: classifyStatus(response.status) };

    const body = await response.text();
    try {
      return { kind: "ok", value: { data: JSON.parse(body) as T, transport } };
    } catch (cause) {
      return {
        kind: "answered",
        error: new TargetprocessError(
          "not-targetprocess",
          "That URL answered, but not with Targetprocess data. Check the address, including any path after the host.",
          response.status,
          { cause },
        ),
      };
    }
  }

  if (unreachable === transports.length) return { kind: "unreachable", cause: lastCause };
  if (throttled) return { kind: "throttled" };
  return { kind: "refused" };
}

/**
 * A rejected token, an unreachable host and a throttled request look alike on one attempt and all
 * clear on their own, so none is reported until the retry plan is exhausted. Definitive answers -
 * 404, 400, 500, a login page - return immediately.
 */
export async function fetchJson<T>(
  instance: Connectable,
  path: string,
  params: Record<string, QueryValue> = {},
  options: FetchOptions = {},
): Promise<Fetched<T>> {
  const plan = retryPlan(instance.authTransport);
  const baseDelay = options.retryDelayMs ?? BASE_DELAY_MS;

  let lastOutcome: RoundOutcome<T> = { kind: "refused" };
  let lastCause: unknown;

  for (const [round, transports] of plan.entries()) {
    await pause((BACKOFF_MULTIPLIERS[round] ?? 0) * baseDelay, options.signal);

    const outcome = await attemptRound<T>(instance, path, params, options, transports, round);

    if (outcome.kind === "ok") return outcome.value;
    if (outcome.kind === "answered") throw outcome.error;

    lastOutcome = outcome;
    if (outcome.kind === "unreachable") lastCause = outcome.cause;
  }

  if (lastOutcome.kind === "unreachable") {
    throw new TargetprocessError("unreachable", "Couldn't reach the instance.", undefined, { cause: lastCause });
  }
  if (lastOutcome.kind === "throttled") {
    throw new TargetprocessError("rate-limited", "Targetprocess is throttling requests. Try again in a moment.", 429);
  }

  throw new TargetprocessError("unauthorised", "Targetprocess rejected the token.", 401);
}
