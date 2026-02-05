import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { environment } from "@raycast/api";
import path from "node:path";

const execFileAsync = promisify(execFile);

const HELPER_PATH = path.join(environment.assetsPath, "dict-helper");

export interface DictResult {
  dict: string;
  word: string;
  definition: string;
}

export interface DictInfo {
  id: string;
  name: string;
}

export async function define(words: string[]): Promise<DictResult[]> {
  if (words.length === 0) return [];
  try {
    const { stdout } = await execFileAsync(HELPER_PATH, ["define", ...words], {
      timeout: 5000,
    });
    return JSON.parse(stdout) as DictResult[];
  } catch {
    return [];
  }
}

export async function complete(prefix: string): Promise<string[]> {
  if (!prefix.trim()) return [];
  try {
    const { stdout } = await execFileAsync(HELPER_PATH, ["complete", prefix], {
      timeout: 3000,
    });
    return JSON.parse(stdout) as string[];
  } catch {
    return [];
  }
}

export async function listDictionaries(): Promise<DictInfo[]> {
  try {
    const { stdout } = await execFileAsync(HELPER_PATH, ["list"], {
      timeout: 3000,
    });
    return JSON.parse(stdout) as DictInfo[];
  } catch {
    return [];
  }
}
