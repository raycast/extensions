import { execFile } from "node:child_process";
import { access, copyFile, mkdtemp, open, rm, writeFile } from "node:fs/promises";
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

async function claim(file: string): Promise<boolean> {
  try {
    await (await open(file, "wx")).close();
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

export async function reservePath(dir: string, filename: string): Promise<string> {
  const ext = path.extname(filename);
  const stem = filename.slice(0, filename.length - ext.length);
  for (let n = 1; n < 1000; n++) {
    const candidate = path.join(dir, n === 1 ? filename : `${stem}-${n}${ext}`);
    if (await claim(candidate)) return candidate;
  }
  const fallback = path.join(dir, `${stem}-${Date.now()}${ext}`);
  if (!(await claim(fallback))) throw new Error(`Could not reserve a file name in ${dir}`);
  return fallback;
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
