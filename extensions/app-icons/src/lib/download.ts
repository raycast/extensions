import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
    const destination = await copyWithUniqueName(png, downloads, iconFilename(name));
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

  const folder = await mkdtemp(join(tmpdir(), "app-icons-"));
  try {
    const response = await fetch(allowed);
    if (!response.ok) throw new Error(`Artwork download failed (${response.status})`);

    const source = join(folder, "source.bin");
    const converted = join(folder, "icon.png");
    await writeFile(source, Buffer.from(await response.arrayBuffer()));
    await execFileAsync("/usr/bin/sips", ["-s", "format", "png", source, "--out", converted]);
    return converted;
  } catch (error) {
    await rm(folder, { recursive: true, force: true });
    throw error;
  }
}

async function copyWithUniqueName(source: string, directory: string, filename: string): Promise<string> {
  const match = filename.match(/^(.*)(\.[^.]+)$/);
  const stem = match?.[1] ?? filename;
  const ext = match?.[2] ?? "";

  const first = join(directory, filename);
  try {
    await copyFile(source, first, constants.COPYFILE_EXCL);
    return first;
  } catch (error) {
    if (!isEexist(error)) throw error;
  }

  for (let index = 1; index < 100; index += 1) {
    const candidate = join(directory, `${stem}-${index}${ext}`);
    try {
      await copyFile(source, candidate, constants.COPYFILE_EXCL);
      return candidate;
    } catch (error) {
      if (!isEexist(error)) throw error;
    }
  }

  const fallback = join(directory, `${stem}-${Date.now()}${ext}`);
  await copyFile(source, fallback, constants.COPYFILE_EXCL);
  return fallback;
}

function isEexist(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
