import os from "node:os";
import path from "node:path";

/**
 * Parse a user-supplied list of CLI home directories into absolute paths.
 *
 * Providers expose these as a free-text preference (`additionalCodexHomes`,
 * `additionalClaudeHomes`), so entries arrive comma- or newline-separated, may
 * be tilde-prefixed, and may repeat the same directory under different
 * spellings.
 */
export function parseAdditionalHomes(value: string, homeDir: string = os.homedir()): string[] {
  const homes = value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => (entry === "~" ? homeDir : entry.startsWith("~/") ? path.join(homeDir, entry.slice(2)) : entry))
    .map((entry) => path.resolve(entry));

  return [...new Set(homes)];
}
