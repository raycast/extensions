import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export async function createTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
}

export async function ensureDir(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}

export async function writeTextFile(fp: string, contents: string): Promise<void> {
  await ensureDir(path.dirname(fp));
  await fs.writeFile(fp, contents, "utf8");
}

export async function removeDir(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true });
}
