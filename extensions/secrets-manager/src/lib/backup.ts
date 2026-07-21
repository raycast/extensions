import { mkdir, copyFile, readdir, rm, access } from "node:fs/promises";
import { join } from "node:path";

export type BackupConfig = { enabled: boolean; dir: string; retention: number };

export async function runBackup(sourceFile: string, cfg: BackupConfig, now: number = Date.now()): Promise<void> {
  if (!cfg.enabled) return;
  try {
    await access(sourceFile);
  } catch {
    return;
  }
  await mkdir(cfg.dir, { recursive: true });
  await copyFile(sourceFile, join(cfg.dir, `secrets-${now}.enc`));
  await prune(cfg.dir, cfg.retention);
}

async function prune(dir: string, retention: number): Promise<void> {
  const files = (await readdir(dir)).filter((f) => /^secrets-\d+\.enc$/.test(f)).sort((a, b) => stamp(a) - stamp(b));
  const excess = files.length - retention;
  for (let i = 0; i < excess; i++) {
    await rm(join(dir, files[i]), { force: true });
  }
}

function stamp(file: string): number {
  return Number(file.replace(/^secrets-(\d+)\.enc$/, "$1"));
}
