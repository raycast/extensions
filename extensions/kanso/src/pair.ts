// Pairing: ask Kanso for a Capture key without anyone copying one.
//
//   POST /pair           -> 202 {request, code, expires}      (429: busy or too many)
//   GET  /pair/<request> -> 202 waiting | 200 {key} | 403 denied | 410 expired or gone
//
// `pair` is a small state machine: it reports each step through `onState`
// (so the view can show "Waiting for Kanso… Code 482 913") and resolves with
// the last one. It never throws.

import { randomBytes } from "node:crypto";
import { Env, KansoError, isRecord, rateLimitKind, send } from "./client";

export const CLIENT = "raycast";
export const CLIENT_NAME = "Raycast";
export const SECRET_HEADER = "X-Kanso-Pair-Secret";

export type PairState =
  | { step: "starting" }
  | { step: "waiting"; code: string; expiresAt: number }
  | { step: "connected"; key: string }
  | { step: "denied" }
  | { step: "expired" }
  | { step: "gone" }
  | { step: "busy" }
  | { step: "rate-limited" }
  | { step: "error"; error: KansoError };

export type Final = Exclude<PairState, { step: "starting" } | { step: "waiting"; code: string; expiresAt: number }>;

export type PairOptions = {
  secret?: string;
  onState?: (state: PairState) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  pollMs?: number;
  /** How long to wait in all, ms. Kanso expires a request after 120 s. */
  maxWaitMs?: number;
  signal?: AbortSignal;
};

/** 32 base64url characters, the secret only this poller holds. */
export function makeSecret(): string {
  return randomBytes(24).toString("base64url");
}

/** "482913" as "482 913", the way the sheet in Kanso shows it. */
export function formatCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

export async function pair(env: Env, port: number, options: PairOptions = {}): Promise<Final> {
  const secret = options.secret ?? makeSecret();
  const sleep = options.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = options.now ?? Date.now;
  const pollMs = options.pollMs ?? 1000;
  const emit = options.onState ?? (() => undefined);
  const finish = (state: Final): Final => {
    emit(state);
    return state;
  };
  emit({ step: "starting" });

  let request: string;
  let code: string;
  let expiresMs: number;
  try {
    const reply = await send(env, port, "/pair", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client: CLIENT, name: CLIENT_NAME, access: "capture", books: null, secret }),
    });
    if (reply.status === 429) {
      return finish({ step: rateLimitKind(reply.body) === "waiting" ? "busy" : "rate-limited" });
    }
    const b = reply.body;
    if (reply.status !== 202 || !isRecord(b) || typeof b.request !== "string" || typeof b.code !== "string") {
      // Kanso's own refusals carry {error, reason}; anything else is a stranger.
      const kanso = isRecord(b) && typeof b.error === "string";
      throw new KansoError(kanso ? "failed" : "wrong-port", port, isRecord(b) ? String(b.reason ?? "") : undefined);
    }
    request = b.request;
    code = b.code;
    expiresMs = (typeof b.expires === "number" ? b.expires : 120) * 1000;
  } catch (e) {
    return finish({ step: "error", error: asKansoError(e, port) });
  }

  const started = now();
  const maxWait = options.maxWaitMs ?? expiresMs + 10_000;
  emit({ step: "waiting", code, expiresAt: started + expiresMs });

  while (!options.signal?.aborted) {
    if (now() - started > maxWait) return finish({ step: "expired" });
    await sleep(pollMs);
    if (options.signal?.aborted) break;
    try {
      const reply = await send(env, port, `/pair/${encodeURIComponent(request)}`, {
        headers: { [SECRET_HEADER]: secret },
      });
      const b = reply.body;
      switch (reply.status) {
        case 202:
          continue;
        case 200:
          if (isRecord(b) && b.state === "allowed" && typeof b.key === "string") {
            return finish({ step: "connected", key: b.key });
          }
          throw new KansoError("wrong-port", port);
        case 403:
          return finish({ step: "denied" });
        case 410:
          return finish({ step: isRecord(b) && b.state === "gone" ? "gone" : "expired" });
        case 429:
          return finish({ step: rateLimitKind(b) === "waiting" ? "busy" : "rate-limited" });
        default:
          throw new KansoError(
            "failed",
            port,
            isRecord(b) && typeof b.reason === "string" ? b.reason : `HTTP ${reply.status}`,
          );
      }
    } catch (e) {
      return finish({ step: "error", error: asKansoError(e, port) });
    }
  }
  return finish({ step: "error", error: new KansoError("failed", port, "Cancelled.") });
}

function asKansoError(e: unknown, port: number): KansoError {
  return e instanceof KansoError ? e : new KansoError("failed", port, e instanceof Error ? e.message : String(e));
}

/** The words for a finished attempt. */
export function finalMessage(state: Final): { title: string; message?: string } {
  switch (state.step) {
    case "connected":
      return { title: "Connected to Kanso" };
    case "denied":
      return { title: "Kanso said no. Run any Kanso command to try again." };
    case "expired":
      return { title: "Kanso didn't answer in time." };
    case "gone":
      return {
        title: "Kanso already handed over the key",
        message:
          "Raycast did not receive it. Revoke the Raycast key in Kanso › Settings › Local API, then connect again.",
      };
    case "busy":
      return {
        title: "A request is already waiting in Kanso",
        message: "If you didn't start it, choose Don't Allow in Kanso. Never Allow a request you didn't start.",
      };
    case "rate-limited":
      return { title: "Too many connection requests", message: "Wait a minute and try again." };
    case "error":
      return { title: state.error.message };
  }
}
