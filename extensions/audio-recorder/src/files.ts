import { readdir, lstat, link, unlink, realpath } from "node:fs/promises";
import path from "node:path";

export interface Recording {
  path: string;
  name: string;
  size: number;
  created: Date;
}
export async function listRecordings(folders: string[]): Promise<Recording[]> {
  const found: Recording[] = [];
  const seen = new Set<string>();
  for (const folder of folders) {
    let names: string[];
    try {
      names = await readdir(folder);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw new Error(`Cannot read recordings in ${folder}: ${(error as Error).message}`);
    }
    for (const name of names) {
      if (name.startsWith(".") || name.includes(".encoding.") || !/\.(m4a|wav)$/i.test(name)) continue;
      const filePath = path.join(folder, name);
      const stat = await lstat(filePath).catch(() => null);
      if (!stat?.isFile() || stat.isSymbolicLink()) continue;
      const canonical = await realpath(filePath);
      if (seen.has(canonical)) continue;
      seen.add(canonical);
      found.push({ path: canonical, name, size: stat.size, created: stat.birthtime });
    }
  }
  return found.sort((a, b) => b.created.getTime() - a.created.getTime());
}
export function renamedPath(file: string, name: string): string {
  const clean = name.trim();
  if (
    !clean ||
    clean === "." ||
    clean === ".." ||
    /[/\\:]/.test(clean) ||
    [...clean].some((character) => character.codePointAt(0)! < 32 || character.codePointAt(0) === 127) ||
    clean.startsWith(".")
  )
    throw new Error("Enter a filename without slashes, colons or control characters.");
  const extension = path.extname(file);
  const stem = clean.toLowerCase().endsWith(extension.toLowerCase()) ? clean.slice(0, -extension.length) : clean;
  if (!stem || Buffer.byteLength(stem + extension, "utf8") > 255) throw new Error("Choose a shorter filename.");
  return path.join(path.dirname(file), stem + extension);
}
export async function renameRecording(file: string, name: string): Promise<string> {
  const target = renamedPath(file, name);
  if (file === target) return target;
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Only regular recording files can be renamed.");
  // link is exclusive: it cannot replace another recording if the destination already exists.
  await link(file, target);
  try {
    await unlink(file);
  } catch (error) {
    await unlink(target).catch(() => undefined);
    throw error;
  }
  return target;
}
