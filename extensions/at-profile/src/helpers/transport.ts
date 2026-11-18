import type { Agent } from "undici";

// Node's built-in fetch refuses responses whose headers pass 16 KB, and YouTube's profile pages send more
// (UND_ERR_HEADERS_OVERFLOW, 2026-11). undici's own fetch takes a larger limit. Loaded on the first request, so a
// command that never checks a profile doesn't load undici.
let agent: Agent | undefined;

/**
 * fetch for profile checks and platform detection
 */
export const siteFetch = (async (input: string | URL, init?: RequestInit) => {
  // The build leaves undici outside the bundle, and Node's import() of it puts every export under `default`
  const loaded = await import("undici");
  const undici = (loaded as unknown as { default?: typeof loaded }).default ?? loaded;
  agent ??= new undici.Agent({ maxHeaderSize: 64 * 1024, connections: 4 });
  return undici.fetch(input, { ...(init as object), dispatcher: agent });
}) as unknown as typeof fetch;
