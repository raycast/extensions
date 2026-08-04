// Where the Research Sync backend lives, and how we talk to it.
//
// Single source of truth: api.ts, offline.ts and capture.ts all reach the same
// Worker, and three independent copies of the URL is three chances for them to
// drift apart.
//
// Deliberately dependency-free — capture.ts pulls in a DOM parser, and the
// reader is bundled into the list command, so anything shared between them has
// to stay light.

export const BASE_URL = "https://readlater-sync.shearm.workers.dev";

export const REQUEST_TIMEOUT_MS = 10000;

// Article bodies are far larger than the item list, so they get longer.
export const BODY_TIMEOUT_MS = 15000;

// Every request to the Worker goes through here. Without a timeout a server
// that accepts the connection but never answers hangs the command until the OS
// gives up, which can be minutes — the user just sees Raycast frozen.
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
