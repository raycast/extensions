/**
 * The relay reports an opened DM's channel id inside the publish response's
 * `message` field, as a JSON document behind a `response:` prefix:
 *
 *   "response:{\"channel_id\":\"...\",\"created\":true}"
 *
 * That is a string contract with no schema behind it, so every way it can fail
 * to parse is treated the same way: return null and let the caller fall back to
 * the id it generated itself. `created` is deliberately not returned; the caller
 * behaves identically whether the conversation was new or already open.
 */
const RESPONSE_PREFIX = "response:";

export function parseOpenedChannelId(message: string): string | null {
  if (!message.startsWith(RESPONSE_PREFIX)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(message.slice(RESPONSE_PREFIX.length));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const channelId = (parsed as { channel_id?: unknown }).channel_id;
  if (typeof channelId !== "string" || channelId === "") return null;
  return channelId;
}
