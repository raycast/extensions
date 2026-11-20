import * as fs from "fs";

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function safeStat(filePath: string): Promise<{ mtimeMs: number; size: number } | null> {
  try {
    const st = await fs.promises.stat(filePath);
    return { mtimeMs: st.mtimeMs, size: st.size };
  } catch {
    return null;
  }
}

export async function safeMtimeMs(filePath: string): Promise<number> {
  const st = await safeStat(filePath);
  return st?.mtimeMs ?? 0;
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}
