import fs from "fs/promises";
import path from "path";

function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

export async function backupFile(filePath: string): Promise<string | null> {
  try {
    await fs.access(filePath);
  } catch {
    return null;
  }

  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const timestamp = formatTimestamp(new Date());
  const backupPath = path.join(dir, `${base}.bak.${timestamp}`);
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

export async function atomicWrite(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const tmpPath = path.join(dir, `.${base}.tmp`);
  await fs.writeFile(tmpPath, content, "utf8");
  await fs.rename(tmpPath, filePath);
}
