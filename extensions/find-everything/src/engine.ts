import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export const HOME = os.homedir();
export const IS_MAC = process.platform === "darwin";
export const INDEX_DIR = path.join(HOME, ".cache", "hypersearch");

// Homebrew first, then system paths, then PATH lookup as last resort.
const BIN_DIRS = [
  path.join(
    HOME,
    "Library/Application Support/FindEverything/bin",
  ),
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  path.join(HOME, ".local", "bin"),
  path.join(HOME, "bin"),
];
export const findBin = (name: string): string => {
  for (const d of BIN_DIRS) {
    const p = path.join(d, name);
    if (fs.existsSync(p)) return p;
  }
  return name;
};
export const FD = findBin("fd");
export const FZF = findBin("fzf");
export const RG = findBin("rg");
export const SPLIT = findBin("split");
export const OPEN_CMD = IS_MAC ? findBin("open") : findBin("xdg-open");

export const BASE_EXCLUDES = [
  ".git",
  ".svn",
  ".hg",
  "node_modules",
  ".Trash",
  ".DS_Store",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  ".cache",
  ".npm",
  ".npx",
  ".bun",
  ".yarn",
  ".pnpm-store",
  ".cargo",
  ".cargo-target",
  ".rustup",
  ".pub-cache",
  ".dartServer",
  ".gem",
  ".gradle",
  ".m2",
  ".cocoapods",
  "Pods",
  "DerivedData",
  ".next",
  ".nuxt",
  "dist",
  "build",
  "target",
  ".venv",
  ".venv*",
  ".venvs",
  "venv",
  ".tox",
  "site-packages",
  ".conda",
  ".pyenv",
  ".nvm",
  ".volta",
  ".deno",
  ".local",
  ".terraform",
  ".serverless",
  ".vercel",
  ".composer",
  ".nuget",
  ".gg",
  ".gemini",
  ".cmux-snapshots",
  ".orbstack",
  ".lmstudio",
  "Library",
  "go/pkg",
];
// Extra excludes when scanning from / (macOS + Linux system noise).
export const ALL_EXCLUDES = [
  "System",
  "dev",
  "net",
  "Volumes",
  "cores",
  "private/var",
  "proc",
  "sys",
  "run",
  "snap",
  "boot",
];

export type Scope =
  | "home"
  | "downloads"
  | "documents"
  | "applications"
  | "all"
  | "custom";
export const SCOPES: Scope[] = [
  "home",
  "downloads",
  "documents",
  "applications",
  "all",
  "custom",
];

export interface EngineOpts {
  includeHidden?: boolean;
  includeIgnored?: boolean;
  extraExcludes?: string;
  customSearchPaths?: string;
  indexMaxAgeMinutes?: string;
}

export function scopePaths(scope: Scope, opts: EngineOpts): string[] {
  const dirs = (() => {
    switch (scope) {
      case "home":
        return [HOME];
      case "downloads":
        return [path.join(HOME, "Downloads")];
      case "documents":
        return [path.join(HOME, "Documents")];
      case "applications":
        return IS_MAC
          ? ["/Applications", path.join(HOME, "Applications")]
          : [
              "/usr/share/applications",
              path.join(HOME, ".local/share/applications"),
            ];
      case "all":
        return ["/"];
      case "custom":
        return (opts.customSearchPaths || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    }
  })();
  return dirs.filter((d) => d === "/" || fs.existsSync(d));
}

export const indexPathFor = (scope: Scope) =>
  path.join(INDEX_DIR, `index-${scope}.txt`);
export const shardDirFor = (scope: Scope) =>
  path.join(INDEX_DIR, `index-${scope}.d`);

export const SHARD_COUNT = 8;
// Per-shard match cap -> at most SHARD_COUNT*cap candidates reach fzf,
// which bounds the worst-case query (e.g. "e") at ~30ms instead of seconds.
const SHARD_CAP = 4000;
const FILE_CAP = 32000;

const inFlight = new Map<string, Promise<void>>();

// The flat index stays canonical; shards are a derived cache that lets
// rg scan all 8 in parallel (~4x) and gives -m a spread across the tree.
export async function shardIndex(file: string, dir: string): Promise<void> {
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) return;
  const tmpDir = `${dir}.tmp`;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  await new Promise<void>((resolve, reject) => {
    const c = spawn(SPLIT, [
      "-n",
      String(SHARD_COUNT),
      file,
      path.join(tmpDir, "s-"),
    ]);
    c.on("error", reject);
    c.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`split exited ${code}`)),
    );
  });
  fs.rmSync(dir, { recursive: true, force: true });
  fs.renameSync(tmpDir, dir);
}

export function rebuildIndex(scope: Scope, opts: EngineOpts): Promise<void> {
  const file = indexPathFor(scope);
  const pending = inFlight.get(file);
  if (pending) return pending;

  const job = new Promise<void>((resolve, reject) => {
    const tmp = `${file}.tmp`;
    const dirs = scopePaths(scope, opts);
    if (dirs.length === 0) {
      fs.writeFileSync(tmp, "");
      fs.renameSync(tmp, file);
      resolve();
      return;
    }
    const excludes = [
      ...BASE_EXCLUDES,
      ...(opts.extraExcludes || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      ...(scope === "all" ? ALL_EXCLUDES : []),
    ];
    const args = ["--absolute-path", "--color=never"];
    if (opts.includeHidden) args.push("--hidden");
    if (opts.includeIgnored) args.push("--no-ignore");
    for (const e of excludes) args.push("--exclude", e);
    args.push("", ...dirs);

    const out = fs.createWriteStream(tmp);
    const child = spawn(FD, args);
    child.stdout.pipe(out);
    child.stderr.resume();
    child.on("error", reject);
    child.on("close", (code) => {
      out.close(() => {
        if (code === 0) {
          fs.renameSync(tmp, file);
          shardIndex(file, shardDirFor(scope))
            .catch(() => {})
            .then(resolve);
        } else {
          fs.rmSync(tmp, { force: true });
          reject(new Error(`fd exited with code ${code}`));
        }
      });
    });
  }).finally(() => inFlight.delete(file));

  inFlight.set(file, job);
  return job;
}

// Shard dir may be missing on upgrade from a flat-index install; split it
// on the fly (~150ms) instead of waiting for the next fd rebuild.
export async function ensureShards(scope: Scope): Promise<void> {
  const file = indexPathFor(scope);
  const dir = shardDirFor(scope);
  if (!fs.existsSync(file)) return;
  const dirFresh =
    fs.existsSync(dir) &&
    fs.statSync(dir).mtimeMs >= fs.statSync(file).mtimeMs;
  if (!dirFresh) await shardIndex(file, dir).catch(() => {});
  // Warm the OS page cache so the first keystroke never hits cold disk.
  if (fs.existsSync(dir))
    spawn(RG, ["-c", "--no-ignore", ".", dir], {
      stdio: "ignore",
      detached: true,
    })
      .on("error", () => {})
      .unref();
}

export async function ensureIndex(
  scope: Scope,
  opts: EngineOpts,
  force = false,
  background = true,
): Promise<string> {
  const file = indexPathFor(scope);
  fs.mkdirSync(INDEX_DIR, { recursive: true });
  const maxAgeMs =
    Math.max(1, parseFloat(opts.indexMaxAgeMinutes || "60")) * 60_000;
  const exists = fs.existsSync(file);
  const stale = exists && Date.now() - fs.statSync(file).mtimeMs > maxAgeMs;
  if (exists && !stale && !force) {
    await ensureShards(scope);
    return file;
  }
  if (exists && stale && !force) {
    // CLI callers pass background=false so a queued fd scan can't pin
    // the event loop after results were already printed.
    if (background) rebuildIndex(scope, opts).catch(() => {});
    await ensureShards(scope);
    return file; // stale-while-revalidate
  }
  await rebuildIndex(scope, opts);
  return file;
}

// Search target: shard dir when available (parallel scan), flat file else.
function searchTarget(scope: Scope): { target: string; isDir: boolean } {
  const dir = shardDirFor(scope);
  if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0)
    return { target: dir, isDir: true };
  return { target: indexPathFor(scope), isDir: false };
}

// Query language (Everything-style, validated): `ext:md;pdf` / `*.md`
// extension lists, `in:downloads` / bare `invoice in downloads` location
// scoping, `type:doc|image|video|audio|zip|code|app|hidden` macros,
// `!noise` exclusion, `a|b` alternation, `"exact phrase"` literal,
// `sort:name|new|old|big|small` result ordering, `size:>10m` / `dm:today`
// post-filters on visible results. Unconsumed words stay fuzzy terms.
export interface ParsedQuery {
  fuzzy: string[]; // fzf filter terms ('exact, a|b, plain)
  constraints: { pattern: string; negate: boolean }[]; // rg stages
  sort?: string;
  sizeFilter?: { op: string; bytes: number };
  dmFilter?: { days: number };
}
const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const IN_ALIASES: Record<string, string> = {
  downloads: "Downloads", documents: "Documents", docs: "Documents",
  desktop: "Desktop", pictures: "Pictures", pics: "Pictures",
  music: "Music", movies: "Movies", applications: "Applications",
  apps: "Applications", projects: "Projects",
};
const TYPE_MACROS: Record<string, string> = {
  doc: "txt|md|pdf|rtf|odt|doc|docx|pages|tex|epub",
  image: "png|jpe?g|gif|webp|svg|heic|tiff?|bmp|ico",
  video: "mp4|m4v|mov|mkv|avi|webm|wmv|flv",
  audio: "mp3|wav|aac|flac|m4a|ogg|opus|aiff?",
  zip: "zip|tar|tgz|gz|bz2|xz|rar|7z",
  code: "py|js|ts|tsx|jsx|swift|rs|go|c|h|cpp|cc|mm|m|java|kt|rb|sh|zsh|pl|lua|sql|html|css|json|ya?ml|toml|xml",
  app: "app|dmg|pkg",
};
const SIZE_UNITS: Record<string, number> = {
  b: 1, k: 1 << 10, kb: 1 << 10, m: 1 << 20, mb: 1 << 20,
  g: 1 << 30, gb: 1 << 30,
};
const DM_DAYS: Record<string, number> = {
  today: 1, yesterday: 2, week: 7, thisweek: 7,
  month: 31, thismonth: 31, year: 366, thisyear: 366,
};
export function parseQuery(q: string): ParsedQuery {
  const pq: ParsedQuery = { fuzzy: [], constraints: [] };
  let rest = q.replace(/"([^"]+)"/g, (_, s) => {
    pq.fuzzy.push(`'${s}`); // fzf exact-substring marker
    return " ";
  });
  const toks = rest.split(/\s+/).filter(Boolean);
  const inTarget = (v: string) => {
    const lv = v.toLowerCase();
    if (IN_ALIASES[lv])
      return `/${IN_ALIASES[lv]}/`;
    if (v.startsWith("/") || v.startsWith("~"))
      return reEsc(v.startsWith("~") ? HOME + v.slice(1) : v);
    return `/${reEsc(lv)}/`;
  };
  for (let i = 0; i < toks.length; i++) {
    const tok = toks[i];
    // bare ` in X` keyword (Raycast style): `invoice in downloads`
    if ((tok === "in" || tok === "in:") && toks[i + 1]) {
      pq.constraints.push({ pattern: inTarget(toks[++i]), negate: false });
      continue;
    }
    if (tok.startsWith("!") && tok.length > 1) {
      pq.constraints.push({ pattern: reEsc(tok.slice(1)), negate: true });
      continue;
    }
    if (tok.startsWith("*." ) && /^[\w-]+$/.test(tok.slice(2))) {
      pq.constraints.push({ pattern: `\\.${tok.slice(2)}$`, negate: false });
      continue;
    }
    const m = tok.match(/^([a-z]+):(.+)$/i);
    if (m) {
      const k = m[1].toLowerCase();
      const v = m[2];
      const lv = v.toLowerCase();
      if (k === "ext") {
        // ext:md;pdf;txt — `;` lists like Everything
        const parts = lv.split(";").filter((e) => /^[\w-]+(\.[\w-]+)*$/.test(e));
        if (parts.length)
          pq.constraints.push({
            pattern: `\\.(${parts.map(reEsc).join("|")})$`,
            negate: false,
          });
        continue;
      }
      if (k === "in") {
        pq.constraints.push({ pattern: inTarget(v), negate: false });
        continue;
      }
      if (k === "type" || k === "is" || k === "kind") {
        if (TYPE_MACROS[lv]) {
          pq.constraints.push({
            pattern: `\\.(${TYPE_MACROS[lv]})$`,
            negate: false,
          });
        } else if (lv === "hidden" || lv === "dot") {
          pq.constraints.push({ pattern: "/\\.", negate: false });
        }
        continue;
      }
      if (k === "sort") {
        if (/^(name|new|old|big|small|size)$/.test(lv))
          pq.sort = lv === "size" ? "big" : lv;
        continue;
      }
      if (k === "size") {
        const sm = lv.match(/^(>|<)?(\d+(?:\.\d+)?)(b|kb?|mb?|gb?)?$/);
        if (sm)
          pq.sizeFilter = {
            op: sm[1] || ">",
            bytes: parseFloat(sm[2]) * (SIZE_UNITS[sm[3] || "b"] || 1),
          };
        continue;
      }
      if (k === "dm" || k === "modified") {
        if (DM_DAYS[lv]) pq.dmFilter = { days: DM_DAYS[lv] };
        else {
          const dm = lv.match(/^(?:<|in)?(\d+)d$/);
          if (dm) pq.dmFilter = { days: parseInt(dm[1]) };
        }
        continue;
      }
    }
    if (tok.includes("|")) {
      // a|b alternation: rg gets a regex stage, fzf keeps native `|`
      const alts = tok.split("|").filter(Boolean).map(reEsc);
      if (alts.length > 1) {
        pq.constraints.push({ pattern: `(${alts.join("|")})`, negate: false });
        pq.fuzzy.push(tok);
        continue;
      }
    }
    pq.fuzzy.push(tok);
  }
  return pq;
}

// Pipeline: rg(term1, file/dir directly) -> rg(term2) ... -> fzf --filter
// rg narrows the index to ~2k candidates in ~25ms (8 parallel shards);
// fzf ranks them. Each shard is -m capped so worst-case queries stay ~30ms.
export function runSearch(
  query: string,
  scope: Scope,
  limit: number,
  onSpawn?: (c: ChildProcess[]) => void,
): Promise<string[]> {
  return new Promise((resolve) => {
    const pq = parseQuery(query);
    const children: ChildProcess[] = [];
    onSpawn?.(children);

    let stream: NodeJS.ReadableStream | undefined;
    if (RG) {
      const { target, isDir } = searchTarget(scope);
      const stages: string[][] = [];
      for (const term of pq.fuzzy) {
        if (term.includes("|")) continue; // alternation already a regex stage
        stages.push([
          ...(isDir ? ["--no-ignore", "--no-filename"] : []),
          "-S", "-F", "-m",
          String(isDir ? SHARD_CAP : FILE_CAP),
          "--no-line-number", "--",
          term.startsWith("'") ? term.slice(1) : term,
        ]);
      }
      for (const c of pq.constraints) {
        stages.push([
          ...(isDir ? ["--no-ignore", "--no-filename"] : []),
          "-i", ...(c.negate ? ["-v"] : []), "-m",
          String(isDir ? SHARD_CAP : FILE_CAP),
          "--no-line-number", "--", c.pattern,
        ]);
      }
      for (const [i, args] of stages.entries()) {
        if (i === 0) args.push(target);
        const p = spawn(RG, args, {
          stdio: ["pipe", "pipe", "ignore"],
        });
        children.push(p);
        p.on("error", () => {}); // binary missing -> empty stage
        p.stdin!.on("error", () => {}); // EPIPE on early kill
        p.stdout!.on("error", () => {});
        if (stream) stream.pipe(p.stdin!);
        stream = p.stdout!;
      }
    }
    if (!stream) {
      stream = fs.createReadStream(indexPathFor(scope));
      stream.on("error", () => {});
    }
    // fzf needs `a | b` with spaces for OR; quoted terms use 'exact syntax.
    const fzfFilter = pq.fuzzy
      .map((t) => (t.includes("|") ? t.split("|").join(" | ") : t))
      .join(" ");
    const fz = spawn(
      FZF,
      [`--filter=${fzfFilter}`, "--scheme=path", "--no-bold"],
      { stdio: ["pipe", "pipe", "ignore"] },
    );
    children.push(fz);
    fz.stdin!.on("error", () => {});
    stream.pipe(fz.stdin!);

    let buf = "";
    let lines = 0;
    fz.stdout!.on("data", (d) => {
      const s = d.toString();
      buf += s;
      lines += (s.match(/\n/g) || []).length;
      if (buf.length > 8 * 1024 * 1024 || lines > 5000) fz.kill("SIGKILL");
    });
    fz.on("close", () => {
      // Downstream exits early on -m caps; upstream rg stages would
      // otherwise block forever writing into a readerless pipe.
      for (const c of children) c.kill("SIGKILL");
      resolve(buf.split("\n").filter(Boolean).slice(0, limit));
    });
    fz.on("error", () => resolve([]));
  });
}

// fzf ranks the rg-filtered candidates; afterwards we partition so that
// hits whose basename contains ALL query terms float to the top.
// Takes the raw query; operator tokens are parsed away internally.
export function rerank(paths: string[], q: string): string[] {
  const groups = parseQuery(q)
    .fuzzy.map((t) => t.replace(/^'/, "").toLowerCase())
    .map((t) => t.split("|")); // each group's alts are OR-ed
  const seen = new Set<string>();
  const nameHit: string[] = [];
  const rest: string[] = [];
  for (const p of paths) {
    if (seen.has(p)) continue;
    seen.add(p);
    const base = path.basename(p).toLowerCase();
    (groups.every((g) => g.some((alt) => base.includes(alt)))
      ? nameHit
      : rest
    ).push(p);
  }
  return [...nameHit, ...rest];
}

// Post-filters needing stat() run on the visible top-N only (the flat
// index stores just paths — stat'ing 4.6M entries would defeat it).
export function applyPostFilters(paths: string[], pq: ParsedQuery): string[] {
  if (!pq.sizeFilter && !pq.dmFilter && !pq.sort) return paths;
  let items = paths.map((p) => {
    try {
      const s = fs.statSync(p);
      return { p, size: s.size, mtime: s.mtimeMs };
    } catch {
      return { p, size: 0, mtime: 0 };
    }
  });
  if (pq.sizeFilter)
    items = items.filter((i) =>
      pq.sizeFilter!.op === ">"
        ? i.size > pq.sizeFilter!.bytes
        : i.size < pq.sizeFilter!.bytes,
    );
  if (pq.dmFilter)
    items = items.filter(
      (i) => Date.now() - i.mtime <= pq.dmFilter!.days * 86_400_000,
    );
  if (pq.sort === "name") items.sort((a, b) => a.p.localeCompare(b.p));
  else if (pq.sort === "new") items.sort((a, b) => b.mtime - a.mtime);
  else if (pq.sort === "old") items.sort((a, b) => a.mtime - b.mtime);
  else if (pq.sort === "big") items.sort((a, b) => b.size - a.size);
  else if (pq.sort === "small") items.sort((a, b) => a.size - b.size);
  return items.map((i) => i.p);
}

export const humanBytes = (n?: number) => {
  if (n === undefined) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
};

export const prettyPath = (p: string) => {
  const s = path.dirname(p).replace(HOME, "~");
  if (s.length <= 60) return s;
  const parts = s.split("/").filter(Boolean);
  return `${parts.slice(0, 2).join("/")}/…/${parts.slice(-2).join("/")}`;
};

export function openPath(p: string): void {
  spawn(OPEN_CMD, [p], { stdio: "ignore", detached: true })
    .on("error", () => {})
    .unref();
}
