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

let cachedBinary: string | null = null;
const isWindows = process.platform === "win32";
const binName = isWindows ? "hister.exe" : "hister";

function isExecutable(filePath: string): boolean {
  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) return false;
    return isWindows ? true : (stats.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

export function getBinaryPath(): string {
  if (cachedBinary && isExecutable(cachedBinary)) {
    return cachedBinary;
  }

  const prefs = getPreferenceValues<Preferences.Search>();
  if (prefs.histerBinaryPath?.trim()) {
    const custom = prefs.histerBinaryPath.trim();
    if (isExecutable(custom)) {
      return (cachedBinary = custom);
    }
    throw new Error(`Custom Hister binary not found or not executable at: ${custom}`);
  }

  const home = os.homedir();
  const candidates = isWindows
    ? [
        path.join(home, "go", "bin", binName),
        path.join(process.env.LOCALAPPDATA ?? "", "Programs", "hister", binName),
        path.join(process.env.ProgramFiles ?? "C:\\Program Files", "hister", binName),
      ]
    : [
        path.join(home, "go", "bin", binName),
        path.join(home, ".local", "bin", binName),
        path.join(home, ".cargo", "bin", binName),
        "/opt/homebrew/bin/hister",
        "/usr/local/bin/hister",
        "/usr/bin/hister",
      ];

  for (const candidate of candidates) {
    if (candidate && isExecutable(candidate)) {
      return (cachedBinary = candidate);
    }
  }

  // Cross-platform system PATH scan
  const pathDirs = (process.env.PATH ?? "").split(path.delimiter);
  for (const dir of pathDirs) {
    if (!dir) continue;
    const fullPath = path.join(dir, binName);
    if (isExecutable(fullPath)) {
      return (cachedBinary = fullPath);
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

  const results: HisterDocument[] = [];
  for (const item of parsed) {
    if (typeof item === "object" && item !== null && typeof (item as Record<string, unknown>).url === "string") {
      const rec = item as Record<string, unknown>;
      const rawUrl = String(rec.url ?? "").trim();
      if (!rawUrl) continue;

      const rawTitle = typeof rec.title === "string" ? rec.title.trim() : "";
      const rawDomain = typeof rec.domain === "string" ? rec.domain.trim() : "";
      const rawScore = typeof rec.score === "number" && !Number.isNaN(rec.score) ? rec.score : 0;
      const rawAdded = typeof rec.added === "number" && !Number.isNaN(rec.added) ? rec.added : 0;
      const rawUpdated = typeof rec.updated === "number" && !Number.isNaN(rec.updated) ? rec.updated : 0;

      results.push({
        id: typeof rec.id === "string" && rec.id.trim() ? rec.id.trim() : rawUrl,
        url: rawUrl,
        title: rawTitle || rawUrl,
        domain: rawDomain,
        score: rawScore,
        added: rawAdded,
        updated: rawUpdated,
      });
    }
  }

  return results;
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
        if (raw.includes("connection refused") || raw.includes("connectex")) {
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
