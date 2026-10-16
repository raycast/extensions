import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export const HOME = os.homedir();
export const IS_MAC = process.platform === "darwin";
export const INDEX_DIR = path.join(HOME, ".cache", "hypersearch");

// Homebrew first, then system paths, then PATH lookup as last resort.
const BIN_DIRS = [
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
    rebuildIndex(scope, opts).catch(() => {});
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
    const terms = query.split(/\s+/).filter(Boolean);
    const children: ChildProcess[] = [];
    onSpawn?.(children);

    let stream: NodeJS.ReadableStream | undefined;
    if (RG) {
      const { target, isDir } = searchTarget(scope);
      for (const [i, term] of terms.entries()) {
        const args = isDir
          ? [
              "--no-ignore",
              "--no-filename",
              "-S",
              "-F",
              "-m",
              String(SHARD_CAP),
              "--no-line-number",
              "--",
              term,
            ]
          : [
              "-S",
              "-F",
              "-m",
              String(FILE_CAP),
              "--no-line-number",
              "--",
              term,
            ];
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
    const fz = spawn(
      FZF,
      [`--filter=${query}`, "--scheme=path", "--no-bold"],
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
    fz.on("close", () =>
      resolve(buf.split("\n").filter(Boolean).slice(0, limit)),
    );
    fz.on("error", () => resolve([]));
  });
}

// fzf ranks the rg-filtered candidates; afterwards we partition so that
// hits whose basename contains ALL query terms float to the top.
export function rerank(paths: string[], q: string): string[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  const nameHit: string[] = [];
  const rest: string[] = [];
  for (const p of paths) {
    if (seen.has(p)) continue;
    seen.add(p);
    const base = path.basename(p).toLowerCase();
    (terms.every((t) => base.includes(t)) ? nameHit : rest).push(p);
  }
  return [...nameHit, ...rest];
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
