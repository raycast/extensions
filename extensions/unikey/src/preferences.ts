import { getPreferenceValues } from "@raycast/api";

export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function vaultPath(): string {
  const p = getPrefs().vaultPath?.trim();
  return p && p.length > 0 ? p : "~/.unikey";
}

export function clipboardClearSeconds(): number {
  const raw = getPrefs().clipboardClearSeconds ?? "30";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n * 1000 : 0;
}
