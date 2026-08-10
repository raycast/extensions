import { readOpencodeAuthToken } from "../agents/opencode-auth";

/**
 * Resolves the Synthetic API token.
 * Priority: Manual preference (if set) -> ~/.local/share/opencode/auth.json ("synthetic" entry)
 */
export function resolveSyntheticToken(preferenceToken?: string): string | null {
  const pref = preferenceToken?.trim() || "";
  if (pref) return pref;
  return readOpencodeAuthToken("synthetic");
}
