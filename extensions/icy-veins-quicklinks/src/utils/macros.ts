import { getPreferenceValues } from "@raycast/api";

export function parseMacros(): Map<string, string> {
  const prefs = getPreferenceValues<Preferences.Iv>();
  const map = new Map<string, string>();
  for (const raw of [
    prefs.macro1,
    prefs.macro2,
    prefs.macro3,
    prefs.macro4,
    prefs.macro5,
  ]) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim().toLowerCase();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && value) map.set(key, value);
  }
  return map;
}

export function expandMacro(
  query: string,
  macros: Map<string, string>,
): string {
  const normalized = query.trim().toLowerCase();
  return macros.get(normalized) ?? query;
}
