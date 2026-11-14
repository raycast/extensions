import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function decodeStoredData(plist: string, key: string): unknown | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const encoded = plist.match(new RegExp(`<key>${escapedKey}<\\/key>\\s*<data>([\\s\\S]*?)<\\/data>`))?.[1];
  if (!encoded) return undefined;

  return JSON.parse(Buffer.from(encoded.replace(/\s/g, ""), "base64").toString("utf8")) as unknown;
}

export async function readStoredData(key: string): Promise<unknown | undefined> {
  const { stdout } = await execFileAsync("/usr/bin/defaults", ["export", "com.Tumerit.Tethered", "-"], {
    maxBuffer: 8 * 1024 * 1024,
    timeout: 10000,
  });
  return decodeStoredData(stdout, key);
}

export async function readStoredItems<T>(key: string, isItem: (value: unknown) => value is T): Promise<T[]> {
  const value = await readStoredData(key);
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`Tethered ${key} data has an unexpected format.`);
  return value.filter(isItem);
}
