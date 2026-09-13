import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getPreferenceValues } from "@raycast/api";

export interface HisterDocument {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly domain: string;
  readonly score: number;
  readonly added: number;
  readonly updated: number;
}

export interface Preferences {
  readonly histerBinaryPath?: string;
  readonly maxResults?: string;
}

let cachedBinary: string | null = null;

function isExecutable(filePath: string): boolean {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile() && (stats.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

export function getBinaryPath(): string {
  if (cachedBinary && isExecutable(cachedBinary)) {
    return cachedBinary;
  }

  const prefs = getPreferenceValues<Preferences>();
  if (prefs.histerBinaryPath?.trim()) {
    const custom = prefs.histerBinaryPath.trim();
    if (isExecutable(custom)) {
      return (cachedBinary = custom);
    }
    throw new Error(`Custom Hister binary not found or not executable at: ${custom}`);
  }

  const home = os.homedir();
  const candidates = [
    path.join(home, "go", "bin", "hister"),
    path.join(home, ".local", "bin", "hister"),
    path.join(home, ".cargo", "bin", "hister"),
    "/opt/homebrew/bin/hister",
    "/usr/local/bin/hister",
    "/usr/bin/hister",
  ];

  for (const candidate of candidates) {
    if (isExecutable(candidate)) {
      return (cachedBinary = candidate);
    }
  }

  throw new Error("Hister binary not found. Start hister or set its path in Extension Preferences.");
}

export function parseHisterOutput(stdout: string): readonly HisterDocument[] {
  const start = stdout.indexOf("[");
  const end = stdout.lastIndexOf("]");
  if (start === -1 || end <= start) return [];

  // ponytail: regex cleans trailing commas hister emits before closing brackets
  const cleanJson = stdout.slice(start, end + 1).replace(/,\s*([\]}])/g, "$1");
  const parsed = JSON.parse(cleanJson);
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(
    (item): item is HisterDocument =>
      typeof item === "object" && item !== null && typeof item.url === "string"
  );
}

export function searchHister(
  query: string,
  limit = 50,
  signal?: AbortSignal
): Promise<readonly HisterDocument[]> {
  const binary = getBinaryPath();
  const trimmed = query.trim();
  const pattern = trimmed || "*";
  const sort = trimmed ? "relevance" : "date";
  const args = ["search", pattern, "--sort", sort, "-f", "json", "-L", String(limit)];

  return new Promise((resolve, reject) => {
    execFile(binary, args, { maxBuffer: 10 * 1024 * 1024, signal }, (err, stdout, stderr) => {
      if (err) {
        if (signal?.aborted) return resolve([]);
        const raw = `${stderr || err.message}`;
        if (raw.includes("connection refused")) {
          return reject(new Error("Hister daemon is not running. Start it with 'hister listen'."));
        }
        return reject(new Error(raw));
      }

      try {
        resolve(parseHisterOutput(stdout));
      } catch (e) {
        reject(new Error(`Failed to parse Hister output: ${(e as Error).message}`));
      }
    });
  });
}
