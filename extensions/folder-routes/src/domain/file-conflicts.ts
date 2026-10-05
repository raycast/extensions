import { extname, join, parse } from "node:path";

export type ConflictBehavior = "prompt" | "skip" | "overwrite" | "keep-both";

export async function createKeepBothPath(
  desiredPath: string,
  pathExists: (path: string) => Promise<boolean>,
): Promise<string> {
  if (!(await pathExists(desiredPath))) {
    return desiredPath;
  }

  const parsed = parse(desiredPath);
  const extension = extname(parsed.base);
  const stem = extension ? parsed.base.slice(0, -extension.length) : parsed.base;

  for (let copyNumber = 1; ; copyNumber += 1) {
    const suffix = copyNumber === 1 ? " copy" : ` copy ${copyNumber}`;
    const candidate = join(parsed.dir, `${stem}${suffix}${extension}`);
    if (!(await pathExists(candidate))) {
      return candidate;
    }
  }
}
