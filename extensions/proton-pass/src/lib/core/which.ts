import { statSync } from "node:fs";
import { delimiter, join } from "node:path";

/**
 * First file named `command` on `pathValue`.
 *
 * On Unix, the file must have an execute bit. Windows has no Unix execute bit
 * and treats an existence check as executable, so any file matches there.
 * Callers use this on Linux only.
 * A command that contains a separator is not searched.
 */
export function findExecutable(command: string, pathValue: string): string | undefined {
  if (command.length === 0 || command.includes("/") || command.includes("\\")) return undefined;

  const seen = new Set<string>();
  for (const dir of pathValue.split(delimiter)) {
    if (!dir || seen.has(dir)) continue;
    seen.add(dir);
    const candidate = join(dir, command);
    try {
      const info = statSync(candidate);
      if (!info.isFile()) continue;
      if (process.platform !== "win32" && (info.mode & 0o111) === 0) continue;
      return candidate;
    } catch {
      // Missing path.
    }
  }
  return undefined;
}
