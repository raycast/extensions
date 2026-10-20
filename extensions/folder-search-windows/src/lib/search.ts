import { execFile } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Prefs } from "./prefs";

export class EverythingUnavailableError extends Error {
  constructor(public reason: "missing" | "not-running") {
    super(
      reason === "missing"
        ? "es.exe (Everything command-line tool) was not found."
        : "Everything is not running, so es.exe cannot answer.",
    );
    this.name = "EverythingUnavailableError";
  }
}

function run(file: string, args: string[], opts: { signal?: AbortSignal; env?: NodeJS.ProcessEnv } = {}) {
  return new Promise<string>((resolve, reject) => {
    execFile(
      file,
      args,
      { windowsHide: true, maxBuffer: 32 * 1024 * 1024, encoding: "utf8", signal: opts.signal, env: opts.env },
      (error, stdout, stderr) => {
        if (error) {
          (error as Error & { stderr?: string }).stderr = stderr;
          reject(error);
        } else {
          resolve(stdout);
        }
      },
    );
  });
}

function parseLines(text: string): string[] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function isAbort(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || (error as { code?: string }).code === "ABORT_ERR");
}

/* ------------------------------------------------------------------ */
/* Everything (voidtools) via es.exe                                   */
/* ------------------------------------------------------------------ */

let cachedEs: string | null | undefined;

export async function resolveEs(customPath?: string): Promise<string | undefined> {
  if (customPath) return existsSync(customPath) ? customPath : undefined;
  if (cachedEs !== undefined) return cachedEs ?? undefined;

  const local = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
  const candidates = [
    path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Everything", "es.exe"),
    path.join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Everything", "es.exe"),
    path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Everything 1.5a", "es.exe"),
    path.join(local, "Microsoft", "WinGet", "Links", "es.exe"),
    path.join(os.homedir(), "scoop", "shims", "es.exe"),
    "C:\\ProgramData\\chocolatey\\bin\\es.exe",
  ];

  let found = candidates.find((c) => existsSync(c));
  if (!found) {
    try {
      found = parseLines(await run("where.exe", ["es.exe"]))[0];
    } catch {
      // not on PATH
    }
  }
  cachedEs = found ?? null;
  return found;
}

async function searchEverything(es: string, query: string, prefs: Prefs, signal?: AbortSignal): Promise<string[]> {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  const roots: (string | undefined)[] = prefs.roots.length ? prefs.roots : [undefined];

  // One scoped call per root, in parallel (like `mdfind -onlyin` on macOS), then merged.
  const perRoot = await Promise.all(
    roots.map(async (root, i) => {
      const out = path.join(os.tmpdir(), `raycast-folder-search-${process.pid}-${Date.now()}-${i}.txt`);
      const args = ["/ad", "-n", String(prefs.maxResults), "-sort", prefs.sort];
      if (root) args.push("-path", root);
      // Exporting to a file guarantees UTF-8 output (accents, non-Latin names).
      args.push("-export-txt", out, ...terms);
      try {
        await run(es, args, { signal });
        return parseLines(await fs.readFile(out, "utf8"));
      } catch (error) {
        if (isAbort(error)) throw error;
        const text = `${(error as Error).message} ${(error as { stderr?: string }).stderr ?? ""}`;
        if (/IPC|not running|window not found/i.test(text)) throw new EverythingUnavailableError("not-running");
        throw error;
      } finally {
        fs.rm(out, { force: true }).catch(() => undefined);
      }
    }),
  );

  return dedupe(perRoot.flat()).slice(0, prefs.maxResults);
}

/* ------------------------------------------------------------------ */

function dedupe(paths: string[]) {
  const seen = new Set<string>();
  return paths.filter((p) => {
    const key = p.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type EverythingStatus = "ok" | "missing" | "not-running";

/** Queries Everything; never throws for a missing/stopped Everything, reports it in `status` instead. */
export async function searchFolders(
  query: string,
  prefs: Prefs,
  signal?: AbortSignal,
): Promise<{ paths: string[]; status: EverythingStatus }> {
  const es = await resolveEs(prefs.esPath);
  if (!es) return { paths: [], status: "missing" };
  if (!query.trim()) return { paths: [], status: "ok" };
  try {
    return { paths: await searchEverything(es, query, prefs, signal), status: "ok" };
  } catch (error) {
    if (error instanceof EverythingUnavailableError) return { paths: [], status: error.reason };
    throw error;
  }
}

/** Direct subfolders of a directory, used by "Browse Folder". */
export async function listSubfolders(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("$") && e.name !== "System Volume Information")
    .map((e) => path.win32.join(dir, e.name))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));
}
