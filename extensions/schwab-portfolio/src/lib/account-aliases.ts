import { getPreferenceValues } from "@raycast/api";

export function getAccountAliases(): Record<string, string> {
  const prefs = getPreferenceValues<Preferences>();
  const raw = (prefs.accountAliases ?? "").trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const aliases: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value !== "string") continue;
      const k = key.trim();
      const v = value.trim();
      if (!k || !v) continue;
      aliases[k] = v;
    }
    return aliases;
  } catch {
    return {};
  }
}
