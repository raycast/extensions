// Checks the Store screenshots: 3–6 PNGs in metadata/, each exactly 2000×1250 as sips reads it.
// Prints one line per problem and exits 1, or prints the count and exits 0.
//   bun scripts/check-screenshots.ts [folder]   (default: metadata)

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const WIDTH = 2000;
const HEIGHT = 1250;

function size(path: string): [number, number] | undefined {
  try {
    const out = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", path], { encoding: "utf8", stdio: "pipe" });
    const w = /pixelWidth: (\d+)/.exec(out)?.[1];
    const h = /pixelHeight: (\d+)/.exec(out)?.[1];
    return w && h ? [Number(w), Number(h)] : undefined;
  } catch {
    return undefined;
  }
}

/** The files the checker looks at: everything in `dir` but dotfiles (macOS writes `._x.png` on some volumes). */
export function screenshotFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => !f.startsWith("."))
    .sort();
}

/** Every problem with the folder's screenshots; empty means it passes. */
export function checkScreenshots(dir: string): string[] {
  if (!existsSync(dir)) return [`no folder at ${dir}`];
  const problems: string[] = [];
  let pngs = 0;
  for (const f of screenshotFiles(dir)) {
    if (!f.toLowerCase().endsWith(".png")) {
      problems.push(`${f} is not a .png`);
      continue;
    }
    pngs++;
    const wh = size(join(dir, f));
    if (!wh) problems.push(`${f}: sips read no size`);
    else if (wh[0] !== WIDTH || wh[1] !== HEIGHT) problems.push(`${f} is ${wh[0]}×${wh[1]}, not ${WIDTH}×${HEIGHT}`);
  }
  if (pngs < 3 || pngs > 6) problems.push(`${pngs} PNGs; the Store wants 3–6`);
  return problems;
}

if (import.meta.main) {
  const dir = process.argv[2] ?? "metadata";
  const problems = checkScreenshots(dir);
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  // Passing means every file counted is a good PNG.
  console.log(`${screenshotFiles(dir).length} screenshots at ${WIDTH}×${HEIGHT} in ${dir}`);
}
