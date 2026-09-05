import { execFile } from "node:child_process";
import fs from "node:fs";

/**
 * Raycast's Node runtime does not inherit the user's shell PATH (it is
 * roughly `/usr/bin:/bin:/usr/sbin:/sbin`). A documented brew or Gadak.app
 * install therefore never shows up via PATH lookup alone.
 */
export const GADAK_CANDIDATES = [
  "/opt/homebrew/bin/gadak",
  "/usr/local/bin/gadak",
  "/Applications/Gadak.app/Contents/Resources/bin/gadak",
] as const;

export const INSTALL_COMMAND = "brew install midagedev/tap/gadak";
export const INSTALL_GUIDE_URL = "https://github.com/midagedev/gadak#install";

let cachedPath: string | undefined;
let cachedPref: string | undefined;

function present(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** First existing path wins. Re-resolves if the cached path disappears. */
export function resolveGadakBinary(pref?: string): string | null {
  const trimmed = pref?.trim() ?? "";
  if (cachedPath && cachedPref === trimmed && present(cachedPath)) {
    return cachedPath;
  }
  cachedPath = undefined;
  cachedPref = trimmed;

  const ordered: string[] = [];
  if (trimmed) ordered.push(trimmed);
  for (const p of GADAK_CANDIDATES) {
    if (!ordered.includes(p)) ordered.push(p);
  }
  for (const p of ordered) {
    if (present(p)) {
      cachedPath = p;
      return p;
    }
  }
  return null;
}

export function forgetResolvedGadak(): void {
  cachedPath = undefined;
}

export function deepLink(key: string, profile: string): string {
  // resolveView in desktop/deeplink.go: action `view`; an empty profile pref
  // must omit the /w/ segment (docs/DESKTOP.md: gadak://view?issue=KEY).
  const w = profile ? `/w/${encodeURIComponent(profile)}` : "";
  return `gadak://view${w}?issue=${encodeURIComponent(key)}`;
}

export function docLink(key: string, profile: string): string {
  // Same grammar, document screen: docs/DESKTOP.md `doc=KEY`.
  const w = profile ? `/w/${encodeURIComponent(profile)}` : "";
  return `gadak://view${w}?doc=${encodeURIComponent(key)}`;
}

export type Issue = {
  issue_key: string;
  summary: string;
  status: string | null;
  status_category: string | null;
  assignee: string | null;
};

export type Match = { field: string; snippet: string };

export type Page = {
  key: string;
  title: string;
  space_key: string;
  author: string | null;
  updated_at: string;
  excerpt: string;
};

export type SearchOk = {
  issues: Issue[];
  pages: Page[];
  matches: Record<string, Match>;
  ms: number;
};

export type SearchFail = {
  stderr: string;
  message: string;
  code?: string | number;
};

export function isSearchFail(e: unknown): e is SearchFail {
  return typeof e === "object" && e !== null && "stderr" in e && "message" in e;
}

function firstNonEmptyLine(text: string): string {
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (t) return t;
  }
  return "";
}

/** Title for a failed `gadak search`. Uses stderr when it names the problem. */
export function searchErrorTitle(fail: SearchFail): string {
  const line = firstNonEmptyLine(fail.stderr);
  const lower = line.toLowerCase();
  // cmd/gadak/sql.go, mcp.go, warnIfStale: "no mirror" / never-synced.
  if (lower.includes("no mirror") || lower.includes("never finished a sync")) {
    return "no mirror yet — run `gadak init && gadak sync`";
  }
  if (line) return line;
  if (fail.code === "ENOENT") return "gadak is not installed";
  return firstNonEmptyLine(fail.message) || "gadak search failed";
}

export function searchErrorDetail(fail: SearchFail): string {
  return firstNonEmptyLine(fail.stderr) || firstNonEmptyLine(fail.message);
}

export function searchErrorFull(fail: SearchFail): string {
  const body = fail.stderr.trim();
  return body || fail.message;
}

/** One row of the empty-query home: something you looked at recently. */
export type RecentVisit = {
  kind: "issue" | "page";
  key: string;
  title: string;
  status: string | null;
  viewed_at: string;
};

/** One row of the empty-query home: something that moved recently. */
export type RecentUpdate = {
  key: string;
  summary: string;
  status: string | null;
  assignee: string | null;
  updated_at: string;
};

export type RecentOk = { viewed: RecentVisit[]; updated: RecentUpdate[] };

/** `gadak sql --json` emits one JSON object per line. */
function runSQL<T>(bin: string, profile: string, query: string): Promise<T[]> {
  const args: string[] = [];
  if (profile) {
    args.push("--profile", profile);
  }
  args.push("sql", "--json", query);
  return new Promise((resolve, reject) => {
    execFile(
      bin,
      args,
      { maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject({
            stderr: String(stderr || ""),
            message: err.message,
            code: (err as NodeJS.ErrnoException).code,
          } satisfies SearchFail);
          return;
        }
        const rows: T[] = [];
        for (const line of stdout.split(/\r?\n/)) {
          const t = line.trim();
          if (!t) continue;
          try {
            rows.push(JSON.parse(t) as T);
          } catch {
            // a stray non-JSON line is a warning, not data
          }
        }
        resolve(rows);
      },
    );
  });
}

/** The empty-query home: recently viewed (local.db visits), recently updated.
 *  Both queries read the mirror only; failures degrade to empty sections. */
export async function runRecent(
  bin: string,
  profile: string,
): Promise<RecentOk> {
  const viewedQ = `
    select v.kind, v.key, max(v.viewed_at) as viewed_at,
           coalesce(i.summary, it.title) as title, i.status as status
    from local.visits v
    left join issues_full i on v.kind='issue' and i.key = v.key
    left join items it on v.kind='page' and it.kind='page' and it.key = v.key
    group by v.kind, v.key order by viewed_at desc limit 8`;
  const updatedQ = `
    select key, summary, status, assignee, updated_at
    from issues_full order by updated_at desc limit 8`;
  const [viewed, updated] = await Promise.all([
    runSQL<RecentVisit>(bin, profile, viewedQ).catch(() => [] as RecentVisit[]),
    runSQL<RecentUpdate>(bin, profile, updatedQ).catch(
      () => [] as RecentUpdate[],
    ),
  ]);
  return { viewed: viewed.filter((v) => v.title), updated };
}

export function runSearch(
  bin: string,
  profile: string,
  q: string,
): Promise<SearchOk> {
  const args: string[] = [];
  if (profile) {
    args.push("--profile", profile);
  }
  args.push("search", "--json", "--limit", "20", q);
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    execFile(
      bin,
      args,
      { maxBuffer: 32 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          const code = (err as NodeJS.ErrnoException).code;
          reject({
            stderr: String(stderr || ""),
            message: err.message,
            code,
          } satisfies SearchFail);
          return;
        }
        try {
          const p = JSON.parse(stdout) as {
            issues?: Issue[];
            pages?: Page[];
            matches?: Record<string, Match>;
          };
          resolve({
            issues: p.issues ?? [],
            pages: p.pages ?? [],
            matches: p.matches ?? {},
            ms: performance.now() - t0,
          });
        } catch {
          reject({
            stderr: String(stderr || stdout || ""),
            message: "gadak search --json returned a body that is not JSON",
          } satisfies SearchFail);
        }
      },
    );
  });
}
