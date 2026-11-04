import { execFile } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { environment } from "@raycast/api";
import { artworkUrl, iconFilename } from "./artwork";

const execFileAsync = promisify(execFile);

export async function saveIconPng(url: string, name: string): Promise<string> {
  const png = await materializePng(url);
  try {
    const downloads = join(homedir(), "Downloads");
    await mkdir(downloads, { recursive: true });
    const destination = await uniquePath(join(downloads, iconFilename(name)));
    await copyFile(png, destination);
    return destination;
  } finally {
    await rm(dirname(png), { recursive: true, force: true });
  }
}

export async function prepareIconPng(url: string, name: string): Promise<string> {
  const png = await materializePng(url);
  try {
    const folder = join(environment.supportPath, "clipboard");
    await mkdir(folder, { recursive: true });
    const destination = join(folder, iconFilename(name));
    await copyFile(png, destination);
    return destination;
  } finally {
    await rm(dirname(png), { recursive: true, force: true });
  }
}

async function materializePng(url: string): Promise<string> {
  const allowed = artworkUrl(url);
  if (!allowed) throw new Error("Invalid artwork URL");

  const response = await fetch(allowed);
  if (!response.ok) throw new Error(`Artwork download failed (${response.status})`);

  const folder = await mkdtemp(join(tmpdir(), "app-icons-"));
  const source = join(folder, "source.bin");
  const converted = join(folder, "icon.png");
  await writeFile(source, Buffer.from(await response.arrayBuffer()));
  await execFileAsync("/usr/bin/sips", ["-s", "format", "png", source, "--out", converted]);
  return converted;
}

async function uniquePath(path: string): Promise<string> {
  if (!(await exists(path))) return path;
  const match = path.match(/^(.*)(\.[^.]+)$/);
  const stem = match?.[1] ?? path;
  const ext = match?.[2] ?? "";
  for (let index = 1; index < 100; index += 1) {
    const candidate = `${stem}-${index}${ext}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${stem}-${Date.now()}${ext}`;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
