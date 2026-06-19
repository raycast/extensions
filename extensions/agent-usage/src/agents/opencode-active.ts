import { readOpencodeAuthToken } from "./opencode-auth";

/**
 * Returns true if the given token matches the OpenCode-configured token
 * for the given provider key.
 */
export function isOpenCodeActiveToken(token: string, providerKey: string): boolean {
  if (!token) return false;
  const ocToken = readOpencodeAuthToken(providerKey);
  if (!ocToken) return false;
  return token.trim() === ocToken.trim();
}
