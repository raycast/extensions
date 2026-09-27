/**
 * Checks the vendored CLI against the hashes `scripts/vendor-cli.mjs` wrote when it vendored it
 * (`src/vendor/cli-integrity.ts`), before `cli.ts` runs it. A file that was changed, cut short
 * or replaced after the build is refused rather than run. No @raycast/api import, so it is tested.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The files that differ from their recorded hash, or cannot be read. Empty when all match. */
export function mismatchedFiles(directory: string, expected: Readonly<Record<string, string>>) {
  return Object.entries(expected)
    .filter(([name, sha256]) => {
      try {
        return (
          createHash("sha256")
            .update(readFileSync(join(directory, name)))
            .digest("hex") !== sha256
        );
      } catch {
        return true;
      }
    })
    .map(([name]) => name);
}
