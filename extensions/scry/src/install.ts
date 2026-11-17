import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, open, readdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { Download } from "./scry";

export const VERSION = "0.6.0";

const DOWNLOAD = ".download-";
const STALE = 60 * 60 * 1000;

const SHA256: Record<string, string> = {
  "aarch64-apple-darwin": "b15cf8af74cce955f008a4f90c8a8fc5a63946003dc919a4f2b82b81b7061e21",
  "x86_64-apple-darwin": "93e6c0b8486a150c9d8a37638823cc451d740216027c6299897ba1f9c12e2ea4",
};

const TARGETS: Record<string, string> = { arm64: "aarch64-apple-darwin", x64: "x86_64-apple-darwin" };

export type Archive = { name: string; url: string; sha256: string };

export function archive(arch: string = process.arch): Archive {
  const target = TARGETS[arch];
  if (target === undefined) throw new Error(`scry has no build for ${arch}`);
  const name = `scry-cli-${target}`;
  const url = `https://github.com/JirkaKlimes/scry/releases/download/v${VERSION}/${name}.tar.xz`;
  return { name, url, sha256: SHA256[target] };
}

const installs = new Map<string, Promise<string>>();

export function install(dir: string, archive: Archive, progress: (event: Download) => void): Promise<string> {
  const running = installs.get(dir) ?? put(dir, archive, progress).finally(() => installs.delete(dir));
  installs.set(dir, running);
  return running;
}

async function put(dir: string, archive: Archive, progress: (event: Download) => void): Promise<string> {
  const scry = join(dir, VERSION, "scry");
  if (existsSync(scry)) return scry;
  await mkdir(dir, { recursive: true });
  const temp = await mkdtemp(join(dir, DOWNLOAD));
  try {
    const file = join(temp, "scry.tar.xz");
    await download(archive, file, progress);
    await promisify(execFile)("tar", ["-xJf", file, "-C", temp]);
    if (!existsSync(scry)) await rm(join(dir, VERSION), { recursive: true, force: true });
    await rename(join(temp, archive.name), join(dir, VERSION)).catch((error) => {
      if (!existsSync(scry)) throw error;
    });
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
  for (const entry of await readdir(dir)) {
    const path = join(dir, entry);
    const downloading =
      entry.startsWith(DOWNLOAD) &&
      (await stat(path).then(
        (info) => Date.now() - info.mtimeMs < STALE,
        () => false,
      ));
    if (entry !== VERSION && !downloading) await rm(path, { recursive: true, force: true });
  }
  return scry;
}

async function download(archive: Archive, path: string, progress: (event: Download) => void): Promise<void> {
  const response = await fetch(archive.url);
  if (!response.ok || !response.body) throw new Error(`Cannot download scry: HTTP ${response.status}`);
  const label = `scry ${VERSION}`;
  const total = Number(response.headers.get("content-length") ?? 0);
  const hash = createHash("sha256");
  const file = await open(path, "wx");
  let done = 0;
  try {
    for await (const chunk of response.body) {
      hash.update(chunk);
      await file.write(chunk);
      done += chunk.length;
      progress({ type: "download", label, done, total });
    }
  } finally {
    await file.close();
  }
  if (hash.digest("hex") !== archive.sha256) throw new Error("The download of scry is damaged");
}
