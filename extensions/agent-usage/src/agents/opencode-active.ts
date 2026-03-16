import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

type OpenCodeAuthEntry = {
  type: "api" | "oauth";
  key?: string;
  access?: string;
  refresh?: string;
  expires?: number;
};

type OpenCodeAuthFile = Record<string, OpenCodeAuthEntry>;

/**
 * Reads ~/.local/share/opencode/auth.json and returns the resolved token
 * for a given OpenCode provider key (e.g. "kimi-for-coding").
 * Returns null if the file does not exist or the provider has no key.
 */
export function getOpenCodeToken(providerKey: string): string | null {
  const authPath = process.env.TEST_OPENCODE_AUTH_PATH ?? join(homedir(), ".local", "share", "opencode", "auth.json");
  try {
    const raw = readFileSync(authPath, "utf-8");
    const data = JSON.parse(raw) as OpenCodeAuthFile;
    const entry = data[providerKey];
    if (!entry) return null;
    return entry.key ?? entry.access ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns true if the given token matches the OpenCode-configured token
 * for the given provider key.
 */
export function isOpenCodeActiveToken(token: string, providerKey: string): boolean {
  if (!token) return false;
  const ocToken = getOpenCodeToken(providerKey);
  if (!ocToken) return false;
  return token.trim() === ocToken.trim();
}
