import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import type { ScanResult } from "../types";

const execFileAsync = promisify(execFile);

/**
 * Clean a scan result using the appropriate method:
 * - "rmrf": rm -rf the path
 * - "command": run the tool-specific command
 * Returns the size that was freed (estimated).
 */
export async function cleanResult(result: ScanResult): Promise<number> {
  const freed = result.size;

  try {
    if (result.cleanAction.type === "rmrf") {
      if (!existsSync(result.path)) return 0;
      // `--` end-of-options marker prevents paths starting with `-` from being
      // treated as options (defense in depth, even though our paths are controlled).
      // We delete the directory itself rather than trashing it: cache directories
      // can be many GB and trashing them defeats the purpose (no immediate space freed).
      await execFileAsync("rm", ["-rf", "--", result.path], { timeout: 60000 });
    } else {
      await execFileAsync(result.cleanAction.command, result.cleanAction.args, { timeout: 120000 });
    }
    return freed;
  } catch {
    return 0;
  }
}

/**
 * Clean all safe results and return total freed bytes.
 */
export async function cleanAllSafe(results: ScanResult[]): Promise<number> {
  let totalFreed = 0;
  for (const result of results) {
    if (result.risk === "safe" && result.available && result.size > 0) {
      totalFreed += await cleanResult(result);
    }
  }
  return totalFreed;
}
