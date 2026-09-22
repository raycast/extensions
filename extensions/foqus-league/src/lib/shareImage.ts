import { execFile } from "node:child_process";
import { access, copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export const SHARE_PIXELS = 1432;

export const DOWNLOADS = path.join(homedir(), "Downloads");

export function posterFilename(periodLabel: string): string {
  const slug = periodLabel.toLowerCase().replace(/\W+/g, "-").replace(/^-|-$/g, "");
  return `foqus-recap-${slug || "recap"}.png`;
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export async function freePath(dir: string, filename: string): Promise<string> {
  const ext = path.extname(filename);
  const stem = filename.slice(0, filename.length - ext.length);
  for (let n = 1; n < 1000; n++) {
    const candidate = path.join(dir, n === 1 ? filename : `${stem}-${n}${ext}`);
    if (!(await exists(candidate))) return candidate;
  }
  return path.join(dir, `${stem}-${Date.now()}${ext}`);
}

export async function renderPosterPng(svgMarkup: string, destination: string, aspect = 1): Promise<string> {
  const work = await mkdtemp(path.join(tmpdir(), "foqus-poster-"));
  try {
    const source = path.join(work, "poster.svg");
    await writeFile(source, svgMarkup, "utf8");
    await run("/usr/bin/qlmanage", ["-t", "-s", String(SHARE_PIXELS), "-o", work, source]);
    const png = `${source}.png`;
    if (!(await exists(png))) throw new Error("QuickLook could not draw the recap");

    if (aspect !== 1)
      await run("/usr/bin/sips", ["-c", String(Math.round(SHARE_PIXELS * aspect)), String(SHARE_PIXELS), png]);

    await copyFile(png, destination);
    return destination;
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
