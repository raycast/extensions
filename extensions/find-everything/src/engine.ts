import { environment } from "@raycast/api";
import { spawn, execFile, ChildProcess } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { pipeline } from "stream/promises";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const HOME = os.homedir();
export const IS_MAC = process.platform === "darwin";
export const INDEX_DIR = environment.supportPath;

// Homebrew first, then system paths, then PATH lookup as last resort.
const BIN_DIRS = [
  path.join(HOME, "Library/Application Support/FindEverything/bin"),
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  path.join(HOME, ".local", "bin"),
  path.join(HOME, "bin"),
];
export const findBin = (name: string): string => {
  for (const d of [
    ...BIN_DIRS,
    ...(process.env.PATH || "").split(path.delimiter),
  ]) {
    const p = path.join(d, name);
    try {
      fs.accessSync(p, fs.constants.X_OK);
      if (fs.statSync(p).isFile()) return p;
    } catch {
      continue;
    }
  }
  return name;
};
export const FD = findBin("fd") === "fd" ? findBin("fdfind") : findBin("fd");
export const FZF = findBin("fzf");
export const RG = findBin("rg");

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
  "home" | "downloads" | "documents" | "applications" | "all" | "custom";
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

const inFlight = new Map<string, Promise<void>>();
const shardJobs = new Map<string, Promise<void>>();

const indexSignature = (file: string) => {
  const s = fs.statSync(file);
  return JSON.stringify([s.ino, s.size, s.mtimeMs]);
};
const settingsFor = (scope: Scope, opts: EngineOpts) =>
  JSON.stringify({
    paths: scopePaths(scope, opts),
    hidden: !!opts.includeHidden,
    ignored: !!opts.includeIgnored,
    excludes: opts.extraExcludes || "",
  });

function settingsMatch(scope: Scope, opts: EngineOpts): boolean {
  try {
    const file = indexPathFor(scope);
    const stored = JSON.parse(fs.readFileSync(`${file}.settings`, "utf8"));
    return (
      stored.settings === settingsFor(scope, opts) &&
      stored.signature === indexSignature(file)
    );
  } catch {
    return false;
  }
}

// Native line splitting avoids a JavaScript callback and write per indexed path.
export async function shardIndex(file: string, dir: string): Promise<void> {
  const pending = shardJobs.get(dir);
  if (pending) {
    await pending;
    return shardIndex(file, dir);
  }
  if (shardsFresh(file, dir)) return;
  const job = (async () => {
    const signature = indexSignature(file);
    const tmpDir = fs.mkdtempSync(`${dir}.tmp-`);
    try {
      const { stdout } = await execFileAsync(findBin("wc"), ["-l", file], {
        timeout: 300000,
      });
      const count = Number(stdout.trim().split(/\s+/)[0]);
      if (!Number.isFinite(count))
        throw new Error("Could not count index lines");
      // Include a possible unterminated final line; split never cuts a path.
      const lines = Math.max(1, Math.ceil((count + 1) / SHARD_COUNT));
      await execFileAsync(
        findBin("split"),
        ["-l", String(lines), file, path.join(tmpDir, "part-")],
        { timeout: 300000 },
      );
      const parts = fs.readdirSync(tmpDir).sort();
      if (parts.length > SHARD_COUNT)
        throw new Error("Index changed while splitting");
      for (let i = 0; i < SHARD_COUNT; i++) {
        const target = path.join(tmpDir, `s-${i}`);
        if (parts[i]) fs.renameSync(path.join(tmpDir, parts[i]), target);
        else fs.writeFileSync(target, "");
      }
      if (indexSignature(file) !== signature) return;
      fs.writeFileSync(path.join(tmpDir, ".source"), signature);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.renameSync(tmpDir, dir);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  })();
  shardJobs.set(dir, job);
  try {
    await job;
  } finally {
    if (shardJobs.get(dir) === job) shardJobs.delete(dir);
  }
}

export async function rebuildIndex(
  scope: Scope,
  opts: EngineOpts,
): Promise<void> {
  const file = indexPathFor(scope);
  const pending = inFlight.get(file);
  if (pending) {
    await pending;
    if (settingsMatch(scope, opts)) return;
    return rebuildIndex(scope, opts);
  }

  const job = (async () => {
    fs.mkdirSync(INDEX_DIR, { recursive: true });
    const tmpDir = fs.mkdtempSync(`${file}.tmp-`);
    const tmp = path.join(tmpDir, "index");
    const dirs = scopePaths(scope, opts);
    const settings = settingsFor(scope, opts);
    try {
      if (dirs.length === 0) {
        fs.writeFileSync(tmp, "");
      } else {
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
        const timeout = setTimeout(() => child.kill("SIGKILL"), 300000);
        child.stderr.resume();
        const exited = new Promise<void>((resolve, reject) => {
          child.on("error", reject);
          child.on("close", (code) =>
            code === 0
              ? resolve()
              : reject(new Error(`fd exited with code ${code}`)),
          );
        });
        try {
          await Promise.all([pipeline(child.stdout, out), exited]);
        } catch (error) {
          child.kill("SIGKILL");
          out.destroy();
          await exited.catch(() => undefined);
          throw error;
        } finally {
          clearTimeout(timeout);
        }
      }
      const metadata = path.join(tmpDir, "settings");
      fs.writeFileSync(
        metadata,
        JSON.stringify({
          settings,
          signature: indexSignature(tmp),
          customSearchPaths: opts.customSearchPaths || "",
          maxAgeMinutes: opts.indexMaxAgeMinutes || "60",
        }),
      );
      fs.renameSync(tmp, file);
      fs.renameSync(metadata, `${file}.settings`);
      // The flat index remains usable if the derived cache cannot be written.
      await shardIndex(file, shardDirFor(scope)).catch((error) =>
        console.error(`Shard cache: ${error.message}`),
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  })().finally(() => inFlight.delete(file));

  inFlight.set(file, job);
  await job;
}

// Repair the derived cache without rescanning the filesystem.
export async function ensureShards(scope: Scope): Promise<void> {
  const file = indexPathFor(scope);
  const dir = shardDirFor(scope);
  if (!fs.existsSync(file)) return;
  if (!shardsFresh(file, dir))
    await shardIndex(file, dir).catch((error) =>
      console.error(`Shard cache: ${error.message}`),
    );
}

export async function ensureIndex(
  scope: Scope,
  opts: EngineOpts,
  force = false,
  background = true,
  onRebuilt?: () => void,
  onError?: (error: Error) => void,
): Promise<string> {
  const file = indexPathFor(scope);
  fs.mkdirSync(INDEX_DIR, { recursive: true });
  const maxAgeMs =
    Math.max(1, parseFloat(opts.indexMaxAgeMinutes || "60") || 60) * 60_000;
  const exists = fs.existsSync(file) && settingsMatch(scope, opts);
  const stale = exists && Date.now() - fs.statSync(file).mtimeMs > maxAgeMs;
  if (exists && !stale && !force) {
    await ensureShards(scope);
    return file;
  }
  if (exists && stale && !force) {
    if (!background) {
      await rebuildIndex(scope, opts);
      return file;
    }
    void rebuildIndex(scope, opts)
      .then(onRebuilt)
      .catch((error) => {
        if (onError) onError(error);
        else console.error(`Background index rebuild: ${error.message}`);
      });
    await ensureShards(scope);
    return file; // stale-while-revalidate
  }
  await rebuildIndex(scope, opts);
  return file;
}

// Search target: shard dir when available (parallel scan), flat file else.
function searchTarget(scope: Scope): { target: string; isDir: boolean } {
  const dir = shardDirFor(scope);
  if (shardsFresh(indexPathFor(scope), dir))
    return { target: dir, isDir: true };
  return { target: indexPathFor(scope), isDir: false };
}

function shardsFresh(file: string, dir: string): boolean {
  try {
    return (
      fs.readFileSync(path.join(dir, ".source"), "utf8") ===
        indexSignature(file) &&
      Array.from({ length: SHARD_COUNT }, (_, i) =>
        fs.existsSync(path.join(dir, `s-${i}`)),
      ).every(Boolean)
    );
  } catch {
    return false;
  }
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
  downloads: "Downloads",
  documents: "Documents",
  docs: "Documents",
  desktop: "Desktop",
  pictures: "Pictures",
  pics: "Pictures",
  music: "Music",
  movies: "Movies",
  applications: "Applications",
  apps: "Applications",
  projects: "Projects",
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
  b: 1,
  k: 1 << 10,
  kb: 1 << 10,
  m: 1 << 20,
  mb: 1 << 20,
  g: 1 << 30,
  gb: 1 << 30,
};
const DM_DAYS: Record<string, number> = {
  today: 1,
  yesterday: 2,
  week: 7,
  thisweek: 7,
  month: 31,
  thismonth: 31,
  year: 366,
  thisyear: 366,
};
export function parseQuery(q: string): ParsedQuery {
  const pq: ParsedQuery = { fuzzy: [], constraints: [] };
  const rest = q.replace(/"([^"]+)"/g, (_, s) => {
    pq.fuzzy.push(`'${s}`); // fzf exact-substring marker
    return " ";
  });
  const toks = rest.split(/\s+/).filter(Boolean);
  const inTarget = (v: string) => {
    const lv = v.toLowerCase();
    if (IN_ALIASES[lv]) return `/${IN_ALIASES[lv]}/`;
    if (v.startsWith("/") || v === "~" || v.startsWith("~/")) {
      const folder = path.resolve(v.startsWith("~") ? HOME + v.slice(1) : v);
      return `^${reEsc(folder === "/" ? folder : folder + "/")}`;
    }
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
    if (tok.startsWith("*.") && /^[\w-]+$/.test(tok.slice(2))) {
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
        const parts = lv
          .split(";")
          .filter((e) => /^[\w-]+(\.[\w-]+)*$/.test(e));
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

// Candidate filters preserve fuzzy subsequences; no cap runs before all terms.
export function runSearch(
  query: string,
  scope: Scope,
  limit: number,
  onSpawn?: (c: ChildProcess[]) => void,
  signal?: AbortSignal,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const pq = parseQuery(query);
    const children: ChildProcess[] = [];
    let source: fs.ReadStream | undefined;
    let settled = false;
    const abort = () => done([]);
    const timer = setTimeout(
      () => fail(new Error("Search timed out after 15 seconds")),
      15000,
    );
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      source?.destroy();
      for (const child of children) {
        child.stdin?.destroy();
        child.stdout?.destroy();
        child.kill("SIGKILL");
      }
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const done = (paths: string[]) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(paths);
    };
    onSpawn?.(children);
    if (signal?.aborted) {
      done([]);
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    const { target, isDir } = searchTarget(scope);
    const stages: string[][] = [];
    for (const term of pq.fuzzy) {
      const literal = term.startsWith("'");
      const pattern = literal
        ? term.slice(1)
        : term
            .split("|")
            .map((alt) => [...alt].map(reEsc).join(".*"))
            .join("|");
      stages.push(["-S", ...(literal ? ["-F"] : []), "--", pattern]);
    }
    for (const constraint of pq.constraints) {
      stages.push([
        "-i",
        ...(constraint.negate ? ["-v"] : []),
        "--",
        constraint.pattern,
      ]);
    }
    let stream: NodeJS.ReadableStream | undefined;
    for (const [i, args] of stages.entries()) {
      const child = spawn(
        RG,
        [
          "--no-config",
          "--color=never",
          "--no-line-number",
          "--no-heading",
          "--no-filename",
          ...(i === 0 && isDir ? ["--no-ignore"] : []),
          ...(i === stages.length - 1
            ? ["-m", String(i === 0 && isDir ? 4000 : 32000)]
            : []),
          ...args,
          ...(i === 0 ? [target] : []),
        ],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
      children.push(child);
      let errorText = "";
      child.stderr!.on("data", (d) => {
        errorText = (errorText + d).slice(-2000);
      });
      child.on("error", fail);
      child.on("close", (code) => {
        if (code !== null && code > 1)
          fail(new Error(errorText || `rg exited with code ${code}`));
      });
      child.stdin!.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code !== "EPIPE") fail(error);
      });
      child.stdout!.on("error", fail);
      if (stream) stream.pipe(child.stdin!);
      stream = child.stdout!;
    }
    if (!stream) {
      source = fs.createReadStream(indexPathFor(scope));
      source.on("error", fail);
      stream = source;
    }
    // rg has already matched literal phrases in full. fzf's extended parser
    // would reinterpret embedded spaces and pipes if it received them again.
    const filter = pq.fuzzy
      .filter((t) => !t.startsWith("'"))
      .map((t) => t.split("|").join(" | "))
      .join(" ");
    const fzf = spawn(
      FZF,
      [`--filter=${filter}`, "--scheme=path", "--no-bold"],
      {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          FZF_DEFAULT_OPTS: "",
          FZF_DEFAULT_OPTS_FILE: "",
        },
      },
    );
    children.push(fzf);
    fzf.on("error", fail);
    fzf.stdin!.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code !== "EPIPE") fail(error);
    });
    let errorText = "";
    fzf.stderr!.on("data", (d) => {
      errorText = (errorText + d).slice(-2000);
    });
    const output: string[] = [];
    let partial = "";
    fzf.stdout!.setEncoding("utf8");
    fzf.stdout!.on("data", (chunk: string) => {
      const lines = (partial + chunk).split("\n");
      partial = lines.pop() || "";
      for (const line of lines) {
        if (line) output.push(line);
        if (output.length >= limit) {
          done(output);
          return;
        }
      }
    });
    fzf.on("close", (code, signal) => {
      if (code !== null && code > 1) {
        fail(new Error(errorText || `fzf exited with code ${code}`));
        return;
      }
      if (signal) {
        done([]);
        return;
      }
      if (partial) output.push(partial);
      done(output.slice(0, limit));
    });
    stream.pipe(fzf.stdin!);
  });
}

// fzf ranks the rg-filtered candidates; afterwards we partition so that
// hits whose basename contains ALL query terms float to the top.
// Takes the raw query; operator tokens are parsed away internally.
export function rerank(paths: string[], q: string): string[] {
  const groups = parseQuery(q).fuzzy.map((t) =>
    t.startsWith("'") ? [t.slice(1).toLowerCase()] : t.toLowerCase().split("|"),
  ); // each group's alts are OR-ed
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
