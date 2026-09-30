import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { extractErrorMessage } from "./errors";
import { expandTilde, pathExists } from "./fs";

const execFileAsync = promisify(execFile);

const SQLITE_BIN = "/usr/bin/sqlite3";
const SQLITE_JSON_BUFFER = 16 * 1024 * 1024;
const MIN_QUERY_LENGTH = 2;

export type AutoCompleteInfo = {
  path: string;
  mtimeMs: number;
};

export type AutocompleteRow = {
  reference: string;
  label: string;
  description?: string | null;
  iconKind?: string | null;
};

type AutoCompletePreferences = {
  autocompletePath?: string;
};

export async function resolveAutoComplete(preferences: AutoCompletePreferences): Promise<AutoCompleteInfo> {
  const override = preferences.autocompletePath?.trim();
  if (override) {
    const fullPath = expandTilde(override);
    if (!(await pathExists(fullPath))) {
      throw new Error(`AutoComplete.db not found at ${fullPath}`);
    }
    const stats = await fs.stat(fullPath);
    return { path: fullPath, mtimeMs: stats.mtimeMs };
  }

  const supportDir = path.join(os.homedir(), "Library", "Application Support");
  const dataRoots = [
    path.join(supportDir, "Logos4", "Data"),
    path.join(supportDir, "Logos", "Data"),
    path.join(supportDir, "Verbum4", "Data"),
    path.join(supportDir, "Verbum", "Data"),
  ];

  const dbMatches: AutoCompleteInfo[] = [];
  const seenRoots = new Set<string>();

  for (const dataDir of dataRoots) {
    if (seenRoots.has(dataDir) || !(await pathExists(dataDir))) {
      continue;
    }
    seenRoots.add(dataDir);

    const accounts = await fs.readdir(dataDir, { withFileTypes: true });
    for (const account of accounts) {
      if (!account.isDirectory()) {
        continue;
      }

      const candidate = path.join(dataDir, account.name, "AutoComplete", "AutoComplete.db");
      if (await pathExists(candidate)) {
        const stats = await fs.stat(candidate);
        dbMatches.push({ path: candidate, mtimeMs: stats.mtimeMs });
      }
    }
  }

  if (dbMatches.length === 0) {
    throw new Error("AutoComplete.db not found. Launch Logos once, then try again.");
  }

  dbMatches.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return dbMatches[0];
}

export async function runSqliteQuery(dbPath: string, sql: string): Promise<Record<string, unknown>[]> {
  try {
    const { stdout } = await execFileAsync(SQLITE_BIN, ["-readonly", "-json", dbPath, sql], {
      maxBuffer: SQLITE_JSON_BUFFER,
    });
    const trimmed = stdout.trim();
    if (!trimmed) {
      return [];
    }
    return JSON.parse(trimmed) as Record<string, unknown>[];
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & { stderr?: string };
    if (execError.code === "ENOENT") {
      throw new Error("sqlite3 binary not found. Install the macOS Command Line Tools.");
    }
    const stderr = typeof execError.stderr === "string" ? execError.stderr.trim() : undefined;
    throw new Error(stderr && stderr.length > 0 ? stderr : extractErrorMessage(error));
  }
}

export function buildAutocompleteSearchTerms(rawQuery: string): string[] {
  const trimmed = rawQuery.trim();
  const seen = new Set<string>();
  const terms: string[] = [];

  const addTerm = (term: string) => {
    const normalized = term.toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    terms.push(term);
  };

  if (trimmed) {
    addTerm(trimmed);
    for (const piece of trimmed.split(/\s+/)) {
      if (piece.length >= MIN_QUERY_LENGTH) {
        addTerm(piece);
      }
    }
  }

  return terms;
}

export function normalizeAutocompleteRow(row: Record<string, unknown>): AutocompleteRow | undefined {
  const reference = typeof row.reference === "string" ? row.reference : "";
  if (!reference) {
    return undefined;
  }

  return {
    reference,
    label: typeof row.label === "string" ? row.label : String(row.label ?? row.reference ?? ""),
    description: typeof row.description === "string" ? row.description : null,
    iconKind: typeof row.iconKind === "string" ? row.iconKind : null,
  };
}

export function escapeSql(input: string): string {
  return input.replace(/'/g, "''");
}
