import { posix } from "node:path";

/**
 * Everything the extension knows about the installed Dazzi, as pure functions so it is tested without Raycast.
 *
 * The extension talks to Dazzi only through what the app bundle ships:
 * - `Contents/Resources/bin/dazzi`: the `dazzi` launcher. `--ask QUESTION [--] [path...]` asks AI Search in a new
 *   tab, `[--] path...` opens folders / reveals files. It hands the request to the running app over its local
 *   socket, or starts the app with it.
 * - `Contents/Resources/tools/bin/autorag`: the bundled librarian CLI. `lite retrieve <query> --json` searches the
 *   same local index the app keeps without a chat model. It runs every retrieval method the shared AutoRAG config
 *   enables, and when that config turns on reranking (`rerank`, set by Dazzi's account models) the candidate
 *   chunks are sent to that rerank endpoint.
 */

/** The longest question the app accepts (`OS_REQUEST_MAX_QUERY_LENGTH` in the app's os-request contract). */
export const MAX_QUESTION_LENGTH = 16_000;

/** Where to look for Dazzi.app, most preferred first: the preference, then the usual install locations. */
export function dazziAppCandidates(preference: string, home: string): string[] {
  const candidates: string[] = [];
  const configured = preference.trim().replace(/\/+$/u, "");
  if (configured.length > 0)
    candidates.push(configured.startsWith("~/") ? posix.join(home, configured.slice(2)) : configured);
  candidates.push("/Applications/Dazzi.app", posix.join(home, "Applications", "Dazzi.app"));
  return [...new Set(candidates)];
}

export const launcherPath = (app: string): string => posix.join(app, "Contents", "Resources", "bin", "dazzi");
export const toolsBinDir = (app: string): string => posix.join(app, "Contents", "Resources", "tools", "bin");
export const retrieveCliPath = (app: string): string => posix.join(toolsBinDir(app), "autorag");

/**
 * The environment the bundled CLI runs in. Raycast starts extensions with a minimal launchd PATH, so the app's
 * own tools go first (the librarian finds minsync and the datasource CLIs by name, exactly as the app arranges),
 * followed by the usual user tool directories. `ELECTRON_RUN_AS_NODE` would turn the app into plain Node.
 */
export function toolEnv(app: string, base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const home = base.HOME ?? "";
  const userDirs = home.length > 0 ? [posix.join(home, ".cargo", "bin"), posix.join(home, ".local", "bin")] : [];
  const entries = [
    toolsBinDir(app),
    ...(base.PATH ?? "").split(":"),
    ...userDirs,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];
  const env: NodeJS.ProcessEnv = { ...base, PATH: [...new Set(entries.filter((entry) => entry.length > 0))].join(":") };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

/**
 * `lite retrieve` arguments. The CLI reads a leading `--` as a flag (`Unknown flag: --x`), so a query that starts
 * with a dash gets a leading space, which the librarian trims away.
 */
export function retrieveArgs(query: string, topK: number): string[] {
  return ["lite", "retrieve", query.startsWith("-") ? ` ${query}` : query, "--json", "--top-k", String(topK)];
}

/** `dazzi --ask` arguments: the question is the option's value, the attachments come after `--`. */
export function askArgs(question: string, paths: readonly string[]): string[] {
  return paths.length === 0 ? ["--ask", question] : ["--ask", question, "--", ...paths];
}

/** `dazzi <path>...` arguments; `--` keeps a name that starts with a dash a path. */
export const openArgs = (paths: readonly string[]): string[] => ["--", ...paths];

export type QuestionCheck =
  { readonly ok: true; readonly question: string } | { readonly ok: false; readonly reason: "empty" | "too-long" };

export function validateQuestion(raw: string): QuestionCheck {
  const question = raw.trim();
  if (question.length === 0) return { ok: false, reason: "empty" };
  if (question.length > MAX_QUESTION_LENGTH) return { ok: false, reason: "too-long" };
  return { ok: true, question };
}

export type LauncherOutcome =
  | { readonly kind: "ok" }
  /** Exit 1 with only missing-path complaints: the request still went through with the paths that exist. */
  | { readonly kind: "partial"; readonly missing: readonly string[] }
  /** A Dazzi from before `--ask`. */
  | { readonly kind: "outdated" }
  | { readonly kind: "failed"; readonly message: string };

const MISSING = /^dazzi: (.+): No such file or directory$/u;

/** What a `dazzi` run means for the person, from its exit status and stderr. */
export function launcherOutcome(status: number | null, stderr: string): LauncherOutcome {
  if (status === 0) return { kind: "ok" };
  const lines = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (
    status === 2 &&
    lines.some((line) => line === "dazzi: unknown option --ask" || line.startsWith("dazzi: unknown option --ask="))
  ) {
    return { kind: "outdated" };
  }
  if (status === 1 && lines.length > 0) {
    const missing = lines.map((line) => MISSING.exec(line)?.[1]);
    if (missing.every((path) => path !== undefined)) return { kind: "partial", missing: missing as string[] };
  }
  return { kind: "failed", message: lines[0] ?? "the dazzi launcher did not finish" };
}
