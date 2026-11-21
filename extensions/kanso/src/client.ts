// The one place that talks to Kanso's local API (http://127.0.0.1:<port>).
// Pairing (pair.ts) and every command (slices 16 and 17) go through it, so the
// failure copy lives here, once.

export const DEFAULT_PORT = 19840;

/** Why a call to Kanso did not work. Each kind has user-facing copy in `messageFor`. */
export type KansoErrorKind =
  | "not-open" // nothing answers on the port and Kanso is not running
  | "api-off" // Kanso is running but nothing answers: the local API is off
  | "wrong-port" // something answers, but it is not Kanso's pairing or API
  | "unauthorized" // 401: the key is not known (any more)
  | "waiting" // 429: a request is already waiting in Kanso
  | "rate-limited" // 429: too many requests in a minute
  | "bad-port" // the Port preference is not a port
  | "failed"; // anything else; `detail` has the reason

export class KansoError extends Error {
  constructor(
    readonly kind: KansoErrorKind,
    readonly port: number,
    readonly detail?: string,
  ) {
    super(messageFor(kind, port, detail));
    this.name = "KansoError";
  }
}

export function messageFor(kind: KansoErrorKind, port: number, detail?: string): string {
  switch (kind) {
    case "not-open":
      return "Kanso isn't open. Open Kanso, then try again.";
    case "api-off":
      return "Kanso's local API is off. Turn it on in Kanso › Settings › Local API.";
    case "wrong-port":
      return `Something else answers on port ${port}, and it isn't Kanso. Set the port shown in Kanso › Settings › Local API.`;
    case "unauthorized":
      return "Kanso no longer knows this key. Connect again.";
    case "waiting":
      return "A request is already waiting in Kanso. If you didn't start it, choose Don't Allow in Kanso.";
    case "rate-limited":
      return "Too many connection requests. Wait a minute and try again.";
    case "bad-port":
      return "The Local API Port preference is not a port. Use a number from 1 to 65535.";
    case "failed":
      return detail ? `Kanso couldn't do that: ${detail}` : "Kanso couldn't do that.";
  }
}

/** Reads the Port preference. Empty means the default. */
export function parsePort(preference: string | undefined): number {
  const text = (preference ?? "").trim();
  if (text === "") return DEFAULT_PORT;
  const port = /^\d{1,5}$/.test(text) ? Number(text) : NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new KansoError("bad-port", DEFAULT_PORT);
  }
  return port;
}

export function baseUrl(port: number): string {
  return `http://127.0.0.1:${port}`;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** What the client needs from the outside; tests replace each part. */
export type Env = {
  fetch: FetchLike;
  /** Is the Kanso app running? Tells "not open" from "local API off". */
  isKansoRunning: () => Promise<boolean>;
};

export type Reply = { status: number; body: unknown };

/**
 * Sends one request. A refused connection becomes "not-open" or "api-off";
 * any other transport failure becomes "failed". The body is parsed as JSON
 * when it is JSON, and is `undefined` when it is not (a web server on the
 * wrong port answers HTML).
 */
export async function send(
  env: Env,
  port: number,
  path: string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Reply> {
  let response: Response;
  try {
    response = await env.fetch(`${baseUrl(port)}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    throw await transportError(env, port, e);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  return { status: response.status, body };
}

async function transportError(env: Env, port: number, e: unknown): Promise<KansoError> {
  if (e instanceof KansoError) return e;
  const text = describe(e);
  if (/ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENOTFOUND|fetch failed|connect/i.test(text)) {
    const running = await env.isKansoRunning().catch(() => false);
    return new KansoError(running ? "api-off" : "not-open", port, text);
  }
  if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
    // Something accepted the connection and never answered: not Kanso.
    return new KansoError("wrong-port", port, "no answer");
  }
  return new KansoError("failed", port, text);
}

function describe(e: unknown): string {
  if (e instanceof Error) {
    const cause = (e as Error & { cause?: unknown }).cause;
    const inner = cause instanceof Error ? ` ${(cause as NodeJS.ErrnoException).code ?? ""} ${cause.message}` : "";
    return `${e.message}${inner}`;
  }
  return String(e);
}

/** A 429's two causes, told apart by what Kanso says. */
export function rateLimitKind(body: unknown): "waiting" | "rate-limited" {
  const reason = isRecord(body) && typeof body.reason === "string" ? body.reason : "";
  return /already waiting/i.test(reason) ? "waiting" : "rate-limited";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The reason in one of Kanso's `{error, reason}` bodies. */
export function reasonOf(body: unknown): string | undefined {
  return isRecord(body) && typeof body.reason === "string" ? body.reason : undefined;
}

/**
 * Calls an MCP tool with a key. Returns the tool's JSON result (its text
 * content, parsed), or throws a `KansoError`. A 401 is "unauthorized": the
 * caller clears the stored key and pairs again.
 */
export async function callTool(env: Env, port: number, key: string, name: string, args: object): Promise<unknown> {
  const reply = await send(env, port, "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  });
  if (reply.status === 401) throw new KansoError("unauthorized", port);
  if (reply.status === 429) throw new KansoError(rateLimitKind(reply.body), port);
  if (!isRecord(reply.body) || reply.body.jsonrpc !== "2.0") {
    if (reply.status === 200 || reply.status === 404 || reply.body === undefined) {
      throw new KansoError("wrong-port", port);
    }
    throw new KansoError("failed", port, reasonOf(reply.body) ?? `HTTP ${reply.status}`);
  }
  if (isRecord(reply.body.error)) {
    throw new KansoError("failed", port, String(reply.body.error.message ?? "error"));
  }
  const result = reply.body.result;
  const text =
    isRecord(result) && Array.isArray(result.content)
      ? result.content.map((c) => (isRecord(c) && typeof c.text === "string" ? c.text : "")).join("")
      : "";
  if (isRecord(result) && result.isError === true) throw new KansoError("failed", port, text);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Does Kanso accept this key? One cheap read. */
export async function checkKey(env: Env, port: number, key: string): Promise<"ok" | "unauthorized"> {
  const reply = await send(env, port, "/notes?limit=1", { headers: { authorization: `Bearer ${key}` } });
  if (reply.status === 401) return "unauthorized";
  if (reply.status === 429) throw new KansoError(rateLimitKind(reply.body), port);
  if (reply.status >= 200 && reply.status < 300 && (Array.isArray(reply.body) || isRecord(reply.body))) return "ok";
  if (reply.status === 403) return "unauthorized";
  throw new KansoError(reply.body === undefined ? "wrong-port" : "failed", port, reasonOf(reply.body));
}
