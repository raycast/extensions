import type { Env, FetchLike } from "../client";

export type Call = { url: string; init?: RequestInit };

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export function refused(): Error {
  const error = new TypeError("fetch failed");
  (error as Error & { cause?: unknown }).cause = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:19840"), {
    code: "ECONNREFUSED",
  });
  return error;
}

/** A fetch that answers from a script, one reply per call, and records the calls. */
export function scripted(replies: Array<Response | Error | (() => Response | Error)>, running = false) {
  const calls: Call[] = [];
  let i = 0;
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const next = replies[Math.min(i++, replies.length - 1)];
    const reply = typeof next === "function" ? next() : next;
    if (reply instanceof Error) throw reply;
    return reply.clone();
  };
  const env: Env = { fetch, isKansoRunning: async () => running };
  return { env, calls };
}
