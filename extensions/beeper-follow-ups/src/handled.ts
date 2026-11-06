import { LocalStorage } from "@raycast/api";

const KEY = "handled-messages";

/** chatID → ID of the latest message the user dismissed. A newer message brings the chat back. */
export async function readHandled(): Promise<Record<string, string>> {
  try {
    const raw = await LocalStorage.getItem<string>(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

export async function setHandled(
  chatID: string,
  messageID: string | undefined,
): Promise<Record<string, string>> {
  const handled = await readHandled();
  if (messageID) handled[chatID] = messageID;
  else delete handled[chatID];
  // Keep the store small: at most 500 entries.
  const entries = Object.entries(handled).slice(-500);
  const next = Object.fromEntries(entries);
  await LocalStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function ageDays(
  timestamp: string | number | Date,
  now = Date.now(),
): number {
  return Math.floor((now - new Date(timestamp).getTime()) / 86_400_000);
}
