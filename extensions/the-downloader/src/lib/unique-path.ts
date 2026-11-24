import * as fs from "node:fs";
import * as path from "node:path";

/**
 * `folder/base.ext`, or `folder/base (2).ext`, `(3)`… when that name is taken,
 * so saving a second file with the same title never overwrites the first.
 */
export function uniqueFilePath(
  folder: string,
  base: string,
  ext: string,
  exists: (p: string) => boolean = fs.existsSync,
): string {
  let candidate = path.join(folder, `${base}.${ext}`);
  for (let n = 2; exists(candidate); n++) candidate = path.join(folder, `${base} (${n}).${ext}`);
  return candidate;
}
