import { homedir } from "os";
import { join } from "path";
import { readFile } from "fs/promises";

/** Parse a .netrc-style document and return the password for `machine`.
 *  Handles `machine <host> login <u> password <p>` and `default` blocks. */
export function parseNetrcPassword(content: string, machine: string): string | null {
  const tokens = content.split(/\s+/).filter(Boolean);
  let current: string | null = null;
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "machine") {
      current = tokens[i + 1] ?? null;
      i += 2;
      continue;
    }
    if (t === "default") {
      current = "default";
      i += 1;
      continue;
    }
    if (t === "password" && current === machine) {
      return tokens[i + 1] ?? null;
    }
    if (t === "login" || t === "password" || t === "account") {
      i += 2; // skip key + value
      continue;
    }
    i += 1;
  }
  return null;
}

/** Read the W&B API key left behind by `wandb login` in ~/.netrc (or ~/_netrc). */
export async function readWandbKeyFromNetrc(): Promise<string | null> {
  for (const name of [".netrc", "_netrc"]) {
    try {
      const content = await readFile(join(homedir(), name), "utf8");
      const key = parseNetrcPassword(content, "api.wandb.ai");
      if (key) return key;
    } catch {
      // file missing or unreadable — try the next candidate
    }
  }
  return null;
}
