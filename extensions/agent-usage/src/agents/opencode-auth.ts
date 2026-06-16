import * as fs from "fs";
import * as os from "os";
import * as path from "path";

function getOpencodeAuthFilePath(): string {
  return process.env.TEST_OPENCODE_AUTH_PATH || path.join(os.homedir(), ".local", "share", "opencode", "auth.json");
}

interface OpencodeAuthEntry {
  key?: string;
  access?: string;
  refresh?: string;
  expires?: number;
  type?: string;
}

type OpencodeAuthFile = Record<string, OpencodeAuthEntry>;

/**
 * Reads a credential from ~/.local/share/opencode/auth.json.
 * For most providers, returns `entry.key`.
 * For github-copilot, returns `entry.access` (OAuth token).
 *
 * @param providerKey - Top-level key in auth.json (e.g. "kimi-for-coding", "synthetic", "github-copilot")
 * @returns The token string, or null if not found / unreadable
 */
export function readOpencodeAuthToken(providerKey: string): string | null {
  try {
    const authFile = getOpencodeAuthFilePath();
    if (!fs.existsSync(authFile)) return null;
    const raw = fs.readFileSync(authFile, "utf-8");
    const parsed = JSON.parse(raw) as OpencodeAuthFile;
    const entry = parsed[providerKey];
    if (!entry) return null;
    // GitHub Copilot uses "access"; all others use "key"
    const token = (entry.key ?? entry.access ?? "").trim();
    return token || null;
  } catch (error) {
    console.error(`Failed to read opencode auth for ${providerKey}:`, error);
    return null;
  }
}
