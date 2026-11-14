import { getPreferenceValues } from "@raycast/api";
import os from "node:os";
import path from "node:path";

export type Terminal = "wt" | "pwsh" | "powershell" | "cmd";

interface RawPreferences {
  searchRoots?: string;
  sort?: string;
  maxResults?: string;
  terminal?: Terminal;
  editorCommand?: string;
  esPath?: string;
  indexDepth?: string;
  indexMaxAge?: string;
}

export interface Prefs {
  roots: string[];
  sort: string;
  maxResults: number;
  terminal: Terminal;
  editorCommand: string;
  esPath?: string;
  indexDepth: number;
  indexMaxAgeMs: number;
}

function toInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Expands ~, strips quotes and trailing separators (except on drive roots like C:\). */
export function normalizeRoot(input: string): string {
  let p = input.trim().replace(/^["']|["']$/g, "");
  if (p === "~" || p.startsWith("~\\") || p.startsWith("~/")) p = path.join(os.homedir(), p.slice(1));
  p = path.win32.normalize(p);
  if (!/^[A-Za-z]:\\$/.test(p)) p = p.replace(/[\\/]+$/, "");
  return p;
}

export function getPrefs(): Prefs {
  const raw = getPreferenceValues<RawPreferences>();
  const roots = (raw.searchRoots ?? "")
    .split(/[;\n]/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map(normalizeRoot);

  return {
    roots: [...new Set(roots)],
    sort: raw.sort || "date-modified-descending",
    maxResults: toInt(raw.maxResults, 100, 10, 1000),
    terminal: raw.terminal || "wt",
    editorCommand: raw.editorCommand?.trim() || "code",
    esPath: raw.esPath?.trim() || undefined,
    indexDepth: toInt(raw.indexDepth, 12, 1, 30),
    indexMaxAgeMs: toInt(raw.indexMaxAge, 6, 1, 24 * 30) * 3600 * 1000,
  };
}
