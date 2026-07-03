import { execFile, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { fetchAliases } from "./aliases";
import { DevServer } from "./types";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Platform primitives
// ---------------------------------------------------------------------------
//
// Everything below the next section divider is pure TypeScript and runs
// unchanged on any OS. To port the extension to a new platform (e.g.
// Windows), swap the helpers in this section, plus fetchAliases in
// [aliases.ts], for equivalents that return the same shapes. Suggested
// mapping:
//   listProcesses  → Get-CimInstance Win32_Process     (or PowerShell)
//   listListeners  → Get-NetTCPConnection -State Listen
//   listCwds       → Win32_Process.ExecutablePath / CWD via WMI
//   fetchAliases   → powershell -c "portless list"     (see aliases.ts)

interface RawProcess {
  pid: number;
  lstart: string; // raw `ps` lstart text, e.g. "Tue May 19 20:02:57 2026"
  command: string; // full command line (including the executable path)
}

interface RawListener {
  pid: number;
  port: number;
  // True when the socket is bound beyond loopback (wildcard or a concrete
  // LAN address), i.e. the server is reachable from other devices on the
  // network. Drives the "Copy Network URL" action.
  lanExposed: boolean;
}

// Capture stdout even when the child exits non-zero (lsof exits 1 if any of
// the queried PIDs has died between our two queries, but the rest of the
// output is still useful).
function stdoutOrThrow(err: unknown): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "stdout" in err &&
    typeof (err as { stdout: unknown }).stdout === "string"
  ) {
    return (err as { stdout: string }).stdout;
  }
  throw err;
}

async function listProcesses(): Promise<RawProcess[]> {
  // ps -A: all processes. -ww: don't truncate long command lines.
  // pid= / lstart= / command= : suppress headers; output each field
  // as-is. lstart is fixed-width 24 chars (`Tue May 19 20:02:57 2026`).
  const { stdout } = await execFileAsync("ps", [
    "-A",
    "-ww",
    "-o",
    "pid=,lstart=,command=",
  ]);
  const procs: RawProcess[] = [];
  for (const line of stdout.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(.+)$/);
    if (!match) continue;
    const rest = match[2];
    if (rest.length < 25) continue; // need at least lstart + one char
    procs.push({
      pid: parseInt(match[1], 10),
      lstart: rest.slice(0, 24),
      command: rest.slice(24).trimStart(),
    });
  }
  return procs;
}

async function listListeners(): Promise<RawListener[]> {
  // -F pn outputs one field per line, prefixed by a type letter:
  //   p<pid> starts a process group
  //   f<fd>  marks a file within that group (we ignore these)
  //   n<addr> is the network address, e.g. "*:3000" or "[::1]:5173"
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("lsof", [
      "-iTCP",
      "-sTCP:LISTEN",
      "-nP",
      "-F",
      "pn",
    ]));
  } catch (err) {
    stdout = stdoutOrThrow(err);
  }
  const out: RawListener[] = [];
  let currentPid = 0;
  for (const line of stdout.split("\n")) {
    if (line[0] === "p") {
      currentPid = parseInt(line.slice(1), 10);
    } else if (line[0] === "n" && currentPid > 0) {
      const addr = line.slice(1);
      const colon = addr.lastIndexOf(":");
      const port = parseInt(addr.slice(colon + 1), 10);
      if (port > 0) {
        const host = addr.slice(0, colon);
        const lanExposed = !(
          host === "127.0.0.1" ||
          host === "[::1]" ||
          host.startsWith("127.")
        );
        out.push({ pid: currentPid, port, lanExposed });
      }
    }
  }
  return out;
}

async function listCwds(pids: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (pids.length === 0) return out;
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("lsof", [
      "-p",
      pids.join(","),
      "-a",
      "-d",
      "cwd",
      "-F",
      "n",
    ]));
  } catch (err) {
    stdout = stdoutOrThrow(err);
  }
  let currentPid = 0;
  for (const line of stdout.split("\n")) {
    if (line[0] === "p") {
      currentPid = parseInt(line.slice(1), 10);
    } else if (line[0] === "n" && currentPid > 0) {
      out.set(currentPid, line.slice(1));
    }
  }
  return out;
}

interface GitInfo {
  // Absolute path to the shared .git directory. Same value for every
  // worktree of the same repo, so it's a stable grouping key.
  commonDir: string;
  // Branch name, or empty for detached HEAD / non-git.
  branch: string;
}

interface GitProbe {
  info: GitInfo | undefined;
  // Absolute path to the HEAD file that defines `branch` (per-worktree for
  // linked worktrees). Its mtime changes on every checkout, which makes it a
  // cheap cache-invalidation signal: see getGitInfoCached.
  headPath?: string;
}

// Resolve git common-dir, branch, and HEAD path for a cwd. Returns
// info: undefined when cwd isn't inside a git working tree. One process
// spawn per call; callers should go through getGitInfoCached.
async function probeGit(cwd: string): Promise<GitProbe> {
  try {
    const { stdout } = await execFileAsync("git", [
      "-C",
      cwd,
      "rev-parse",
      "--git-common-dir",
      "--abbrev-ref",
      "HEAD",
      "--git-path",
      "HEAD",
    ]);
    // rev-parse prints one line per request, in argument order.
    const [commonDirRaw, branchRaw, headRaw] = stdout.trim().split("\n");
    if (!commonDirRaw) return { info: undefined };
    const commonDir = path.isAbsolute(commonDirRaw)
      ? commonDirRaw
      : path.resolve(cwd, commonDirRaw);
    const branch = branchRaw === "HEAD" ? "" : (branchRaw ?? "");
    const headPath = headRaw
      ? path.isAbsolute(headRaw)
        ? headRaw
        : path.resolve(cwd, headRaw)
      : undefined;
    return { info: { commonDir, branch }, headPath };
  } catch {
    return { info: undefined };
  }
}

interface GitCacheEntry {
  probe: GitProbe;
  headMtimeMs?: number;
  checkedAt: number;
}

// Per-cwd git cache. Spawning `git rev-parse` for every project on every
// poll is the kind of background cost that adds up in a long-lived
// dashboard session; the data it returns only changes on checkout. The HEAD
// file's mtime is bumped by every checkout (including in linked worktrees,
// which each have their own HEAD), so a single statSync per project per poll
// replaces the spawn. Non-git cwds re-probe on a coarse TTL so a `git init`
// under a running server is eventually picked up.
const gitCache = new Map<string, GitCacheEntry>();
const NON_GIT_RECHECK_MS = 60_000;

async function getGitInfoCached(cwd: string): Promise<GitInfo | undefined> {
  const entry = gitCache.get(cwd);
  if (entry) {
    if (entry.probe.info && entry.probe.headPath) {
      try {
        const mtime = fs.statSync(entry.probe.headPath).mtimeMs;
        if (mtime === entry.headMtimeMs) return entry.probe.info;
      } catch {
        // HEAD vanished (repo deleted out from under us); fall through to a
        // fresh probe.
      }
    } else if (Date.now() - entry.checkedAt < NON_GIT_RECHECK_MS) {
      return entry.probe.info;
    }
  }
  const probe = await probeGit(cwd);
  let headMtimeMs: number | undefined;
  if (probe.headPath) {
    try {
      headMtimeMs = fs.statSync(probe.headPath).mtimeMs;
    } catch {
      // Unreadable HEAD just means we re-probe next poll.
    }
  }
  gitCache.set(cwd, { probe, headMtimeMs, checkedAt: Date.now() });
  return probe.info;
}

// ---------------------------------------------------------------------------
// Pure aggregation (cross-platform)
// ---------------------------------------------------------------------------

type ShopifyTool = "shopify-theme" | "shopify-app" | "shopify-hydrogen";

function commandBase(token: string): string {
  return path.basename(token).replace(/\.(?:cmd|exe|ps1)$/i, "");
}

function shopifyToolFromArgs(
  tokens: string[],
  index: number,
): ShopifyTool | null {
  const area = tokens[index + 1];
  const command = tokens[index + 2];
  if (area === "theme" && command === "dev") return "shopify-theme";
  if (area === "app" && command === "dev") return "shopify-app";
  if (area === "hydrogen" && command === "dev") return "shopify-hydrogen";
  return null;
}

function detectShopifyTool(command: string): ShopifyTool | null {
  const tokens = command.trim().split(/\s+/);
  if (tokens.length < 3) return null;

  if (commandBase(tokens[0]) === "shopify") {
    return shopifyToolFromArgs(tokens, 0);
  }

  // Global Shopify CLI installs commonly show up as:
  //   node /path/to/bin/shopify theme dev
  // Keep this bounded so wrapper commands like `concurrently ... shopify theme
  // dev` don't get mislabeled if the wrapper ever owns a listener.
  if (["node", "nodejs", "bun", "npx"].includes(commandBase(tokens[0]))) {
    for (let i = 1; i < Math.min(tokens.length - 2, 5); i++) {
      if (commandBase(tokens[i]) !== "shopify") continue;
      return shopifyToolFromArgs(tokens, i);
    }
  }

  return null;
}

// A candidate is anything launched from node_modules (broader than .bin/ so
// we catch `node node_modules/serve/build/main.js` etc.), a bare bun process,
// OR a Shopify CLI dev process. Over-collection is harmless: only PIDs with a
// LISTEN socket survive the join below.
function isCandidate(proc: RawProcess): boolean {
  if (/node_modules\//.test(proc.command)) return true;
  if (detectShopifyTool(proc.command)) return true;
  const exec = proc.command.split(/\s+/, 1)[0];
  return /(\/|^)bun$/.test(exec);
}

function detectRuntime(command: string): "node" | "bun" {
  const exec = command.split(/\s+/, 1)[0];
  return /(\/|^)bun$/.test(exec) ? "bun" : "node";
}

function detectTool(command: string, cwd: string): string {
  const shopifyTool = detectShopifyTool(command);
  if (shopifyTool) return shopifyTool;

  // 1. Prefer the .bin/ name (e.g. node_modules/.bin/vite)
  const bin = command.match(/node_modules\/\.bin\/(\S+)/);
  if (bin) {
    const name = bin[1];
    // SvelteKit runs under vite; promote when svelte.config is present.
    if (name === "vite" && hasSvelteConfig(cwd)) return "sveltekit";
    return name;
  }
  // 2. Fall back to the package name from node_modules/<pkg>/. This handles
  //    `node node_modules/serve/build/main.js` (→ "serve") and scoped
  //    packages like `node_modules/@vitejs/plugin-react/...`.
  const pkg = command.match(/node_modules\/(@[^/]+\/[^/\s]+|[^/\s]+)/);
  if (pkg) return pkg[1];
  // 3. Bare bun script (no node_modules anywhere in the command).
  if (detectRuntime(command) === "bun") return "bun";
  return "node";
}

function hasSvelteConfig(cwd: string): boolean {
  return (
    fs.existsSync(`${cwd}/svelte.config.js`) ||
    fs.existsSync(`${cwd}/svelte.config.ts`) ||
    fs.existsSync(`${cwd}/svelte.config.mjs`) ||
    fs.existsSync(`${cwd}/svelte.config.cjs`)
  );
}

// A single dev-server PID often has multiple LISTEN sockets: the main HTTP
// server plus ephemeral HMR/IPC/prebundling ports. Pick the LOWEST per PID
// because configured dev ports (3000, 4321, 5173, 8080) are always below
// ephemeral ports (32768+); without this the displayed port flickers across
// refreshes.
//
// lanExposed is tracked for the CHOSEN port specifically (OR'd across
// same-port binds, e.g. separate IPv4 and IPv6 sockets), not for any socket
// of the PID. A loopback-only HTTP server whose HMR socket happens to bind
// wildcard must not advertise a network URL that can't actually connect.
function lowestPortPerPid(
  listeners: RawListener[],
): Map<number, { port: number; lanExposed: boolean }> {
  const out = new Map<number, { port: number; lanExposed: boolean }>();
  for (const { pid, port, lanExposed } of listeners) {
    const cur = out.get(pid);
    if (cur === undefined || port < cur.port) {
      out.set(pid, { port, lanExposed });
    } else if (port === cur.port && lanExposed) {
      cur.lanExposed = true;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Per-PID metadata cache. A process's cwd, tool, and runtime are immutable
// for its lifetime, so we resolve them once per PID and skip the second lsof
// (cwd lookup) plus the tool-detection regexes on every later poll. Keyed by
// pid and validated against lstart so a recycled PID can't inherit a dead
// process's metadata.
interface PidMeta {
  lstart: string;
  cwd: string;
  tool: string;
  runtime: "node" | "bun";
}
const pidMetaCache = new Map<number, PidMeta>();

export async function fetchServers(): Promise<DevServer[]> {
  const [procs, listeners, aliasesByPort] = await Promise.all([
    listProcesses(),
    listListeners(),
    fetchAliases(),
  ]);
  const candidates = procs.filter(isCandidate);
  const portByPid = lowestPortPerPid(listeners);
  const live = candidates.filter((p) => portByPid.has(p.pid));

  // Resolve cwds only for PIDs we haven't seen before (or whose lstart says
  // the PID was recycled). On a steady-state poll this list is empty and the
  // lsof cwd query is skipped entirely.
  const unseen = live.filter(
    (p) => pidMetaCache.get(p.pid)?.lstart !== p.lstart,
  );
  const cwdByPid = await listCwds(unseen.map((p) => p.pid));
  for (const proc of unseen) {
    const cwd = cwdByPid.get(proc.pid);
    if (!cwd) continue; // shouldn't happen for live processes, but be safe
    pidMetaCache.set(proc.pid, {
      lstart: proc.lstart,
      cwd,
      tool: detectTool(proc.command, cwd),
      runtime: detectRuntime(proc.command),
    });
  }
  // Evict entries for processes that are gone so the cache stays bounded.
  const livePids = new Set(live.map((p) => p.pid));
  for (const pid of pidMetaCache.keys()) {
    if (!livePids.has(pid)) pidMetaCache.delete(pid);
  }

  // Look up git info per unique cwd, in parallel (cached by HEAD mtime, see
  // getGitInfoCached). Worktrees of the same repo share a git common-dir, so
  // we use that path as the project key, which collapses sibling worktrees
  // into one group while still letting us show the branch on each row. The
  // project's display name is the basename of the common-dir's parent (the
  // repo root).
  const uniqueCwds = [
    ...new Set(
      live
        .map((p) => pidMetaCache.get(p.pid)?.cwd)
        .filter((c): c is string => Boolean(c)),
    ),
  ];
  const gitByCwd = new Map<string, GitInfo | undefined>();
  await Promise.all(
    uniqueCwds.map(async (cwd) =>
      gitByCwd.set(cwd, await getGitInfoCached(cwd)),
    ),
  );

  const servers: DevServer[] = [];
  for (const proc of live) {
    const meta = pidMetaCache.get(proc.pid);
    if (!meta) continue;
    const listener = portByPid.get(proc.pid);
    if (listener === undefined) continue;
    const port = listener.port;
    // Drop the portless proxy daemon itself. It's a node process out of
    // node_modules/portless/ that binds 80/443/1355, and would otherwise
    // appear as a phantom "dev server" row. Child processes spawned by
    // portless run their own framework binary (next, vite, …) so they
    // resolve to that tool, not "portless".
    if (meta.tool === "portless") continue;
    const git = gitByCwd.get(meta.cwd);
    // For git projects: key is the shared .git dir path (stable across all
    // worktrees of the repo), name is the basename of its parent (the repo
    // root). For non-git: both fall back to the worktree itself.
    const projectName = git
      ? path.basename(path.dirname(git.commonDir))
      : path.basename(meta.cwd) || meta.cwd;
    const projectKey = git ? git.commonDir : meta.cwd;
    const customUrls = aliasesByPort.get(port);
    const localUrl = `http://localhost:${port}`;
    servers.push({
      pid: proc.pid,
      port: String(port),
      url: customUrls?.[0] ?? localUrl,
      localUrl,
      customUrls,
      tool: meta.tool,
      runtime: meta.runtime,
      cwd: meta.cwd,
      projectKey,
      projectName,
      branch: git?.branch || undefined,
      lanExposed: listener.lanExposed,
      startedAt: new Date(proc.lstart),
    });
  }
  return servers;
}

// User-initiated kill: SIGTERM (the default signal), graceful: the
// dev server gets a chance to flush logs, close connections, etc. Use
// this from the dashboard's Kill / Kill All flows. Pair with `killServer`
// below when you need an *immediate* port release (e.g. restart).
//
// Async-shaped so callers can pass the returned promise to Raycast's
// `mutate(fn, { optimisticUpdate })` flow. `process.kill` itself is sync.
export async function killProcess(pid: number): Promise<void> {
  process.kill(pid);
}

export type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

// Detect package manager from lockfile presence. First match wins; order is
// bun → pnpm → yarn → npm because bun/pnpm/yarn projects often retain a
// stale package-lock.json from before a migration.
export function detectPackageManager(cwd: string): PackageManager {
  if (fs.existsSync(`${cwd}/bun.lockb`) || fs.existsSync(`${cwd}/bun.lock`))
    return "bun";
  if (fs.existsSync(`${cwd}/pnpm-lock.yaml`)) return "pnpm";
  if (fs.existsSync(`${cwd}/yarn.lock`)) return "yarn";
  return "npm";
}

// All managers honor `<pm> run <script>`. Explicit `run` works for arbitrary
// script names (including ones with colons like `dev:web`) and removes the
// ambiguity of the bare-shorthand form.
const PM_RUN: Record<PackageManager, [string, string[]]> = {
  bun: ["bun", ["run"]],
  pnpm: ["pnpm", ["run"]],
  yarn: ["yarn", ["run"]],
  npm: ["npm", ["run"]],
};

// Heuristic tokens for the script-value fallback in pickDevScript. We match
// the binary names that frameworks actually invoke in dev mode, with negative
// lookaheads on the common production subcommands so we don't accidentally
// pick a `build` or `preview` script. Ordering doesn't matter; first hit
// wins inside any given script value.
const DEV_SCRIPT_TOKENS: RegExp[] = [
  /\bvite\b(?!\s+(?:build|preview|optimize))/,
  /\bnext\s+dev\b/,
  /\bastro\s+dev\b/,
  /\bnuxt\s+dev\b/,
  /\bwebpack-dev-server\b/,
  /\bwebpack\s+serve\b/,
  /\bparcel\b(?!\s+build)/,
  /\bgatsby\s+develop\b/,
  /\bremix\s+(?:dev|vite:dev)\b/,
  /\bturbo\s+(?:run\s+)?dev\b/,
  /\bbun\s+(?:--watch|--hot|run\s+dev)\b/,
  /\bnodemon\b/,
  /\btsx\s+watch\b/,
  /\bts-node-dev\b/,
  /\bserve\b/,
  /\bhttp-server\b/,
  /\blive-server\b/,
];

// Pick the most likely dev-server script in a project. First tries the
// canonical key chain (`dev` → `start` → `develop`), then falls back to a
// value-side heuristic so monorepo conventions like `dev:web` or
// `start:dev` still resolve. Returns the script key (not the command), or
// null when nothing in package.json looks like a dev server.
export function pickDevScript(cwd: string): string | null {
  let pkg: { scripts?: Record<string, unknown> };
  try {
    pkg = JSON.parse(
      fs.readFileSync(path.join(cwd, "package.json"), "utf8"),
    ) as { scripts?: Record<string, unknown> };
  } catch {
    return null;
  }
  const scripts = pkg.scripts ?? {};
  for (const name of ["dev", "start", "develop"]) {
    if (typeof scripts[name] === "string") return name;
  }
  // Iterate in declared order (Node preserves JSON insertion order), so the
  // pick is deterministic for a given package.json.
  for (const [name, value] of Object.entries(scripts)) {
    if (typeof value !== "string") continue;
    if (DEV_SCRIPT_TOKENS.some((re) => re.test(value))) return name;
  }
  return null;
}

// Canonicalize a path so two equivalent forms (alias / symlink / `/tmp` vs
// `/private/tmp`) compare equal. Critical for the "is this project already
// running?" check: lsof reports realpath for a process's cwd, so anything
// we compare against it must also be realpath. Returns the input on
// failure so callers don't have to handle a missing path twice.
export function canonicalCwd(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
}

// A Shopify theme root. Shopify CLI requires only `layout/theme.liquid` to
// treat a directory as a theme ("Only a layout directory containing a
// theme.liquid file is required"), so that's the canonical marker.
// `shopify.theme.toml` (the CLI's optional environments file) is accepted as
// a secondary signal for repos that keep one at the root.
export function isShopifyThemeRoot(dir: string): boolean {
  return (
    fs.existsSync(path.join(dir, "layout", "theme.liquid")) ||
    fs.existsSync(path.join(dir, "shopify.theme.toml"))
  );
}

// A Shopify app root. Per Shopify's app-structure docs, shopify.app.toml
// "represents the root of the app".
export function isShopifyAppRoot(dir: string): boolean {
  return fs.existsSync(path.join(dir, "shopify.app.toml"));
}

function isProjectRoot(dir: string): boolean {
  return (
    fs.existsSync(path.join(dir, "package.json")) ||
    isShopifyThemeRoot(dir) ||
    isShopifyAppRoot(dir)
  );
}

// Walk up from a filesystem path to the nearest directory that looks like a
// startable project: one containing a package.json, or a Shopify theme/app
// root (themes have no package.json at all). Used to resolve a Finder
// selection (which may be a file, a subfolder, or the project root itself)
// to a project root we can spawn in. The returned path is canonicalized so
// it round-trips through process inspection without symlink-induced
// mismatches. Returns null when the path isn't inside any known project.
export function findProjectRoot(startPath: string): string | null {
  let cur: string;
  try {
    const st = fs.statSync(startPath);
    cur = st.isDirectory() ? startPath : path.dirname(startPath);
  } catch {
    return null;
  }
  for (;;) {
    if (isProjectRoot(cur)) return canonicalCwd(cur);
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

// Slugify cwd for use in a temp-dir log filename.
function cwdSlug(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "root";
}

// Decide what command starts this project's dev server.
//
// 1. A package.json dev script always wins: it's the project's explicit
//    intent, and scaffolded Shopify apps and Hydrogen storefronts already
//    ship `dev: shopify app dev` / `shopify hydrogen dev` there, so they
//    resolve through this branch like any other Node project. Explicit
//    scripts also cover themes that wrap `shopify theme dev` in
//    concurrently-style tooling.
// 2. With no usable script, fall back to the Shopify CLI for theme and app
//    roots. Themes are the important case: they have no package.json, so
//    nothing else could ever start (or restart) them.
//
// First-run caveat for the Shopify fallbacks: `shopify theme dev` / `app
// dev` prompt for login and store selection when the CLI has no remembered
// state. A detached spawn can't answer prompts, so the 15s watchdog fires
// and the startup log shows the prompt text. After a one-time
// `shopify theme dev --store <store>` in a terminal, the CLI remembers the
// store and starts cleanly from here.
function planSpawn(cwd: string): { cmd: string; args: string[] } | null {
  const script = pickDevScript(cwd);
  if (script) {
    const pm = detectPackageManager(cwd);
    const [cmd, baseArgs] = PM_RUN[pm];
    return { cmd, args: [...baseArgs, script] };
  }
  if (isShopifyThemeRoot(cwd))
    return { cmd: "shopify", args: ["theme", "dev"] };
  if (isShopifyAppRoot(cwd)) return { cmd: "shopify", args: ["app", "dev"] };
  return null;
}

// ---------------------------------------------------------------------------
// Shopify theme port fallback
// ---------------------------------------------------------------------------
//
// `shopify theme dev` binds 127.0.0.1:9292 and, unlike Vite/Next-style dev
// servers, has no next-free-port fallback: when the port is taken it dies
// with a raw EADDRINUSE (Shopify/cli#5554). That kills the obvious two-copies
// case — e.g. a git worktree of a theme whose main checkout is already
// serving. The CLI honors SHOPIFY_FLAG_PORT (the env twin of --port), and an
// env var survives any script wrapping (`npm run dev` → concurrently →
// `shopify theme dev`), so pre-picking a free port and exporting it fixes
// both the bare-CLI fallback spawn and wrapped dev scripts in one move. An
// explicit --port in the user's own script still wins: the CLI gives argv
// flags precedence over env.

const SHOPIFY_THEME_DEFAULT_PORT = 9292;
const PORT_SCAN_LIMIT = 20;

// Ports handed to still-booting spawns. A multi-target start (two theme
// worktrees selected in Finder) spawns in parallel; without this both probes
// would see the same port free and one server would crash. OS-level port
// exclusion does NOT make this map redundant: each probe closes its test
// socket immediately (see canBind), so the port reads as free again until
// the CLI itself binds it seconds later. Entries expire after 15s — the
// spawn watchdog's window — by which point the CLI has either bound the
// port (the probe now sees it busy) or died.
const recentlyPickedPorts = new Map<number, number>();
const PORT_RESERVATION_MS = 15_000;

function isReservedPort(port: number): boolean {
  const pickedAt = recentlyPickedPorts.get(port);
  if (pickedAt === undefined) return false;
  if (Date.now() - pickedAt > PORT_RESERVATION_MS) {
    recentlyPickedPorts.delete(port);
    return false;
  }
  return true;
}

// Probe by attempting the same bind the CLI makes (127.0.0.1). A wildcard
// listener on the port fails this bind too, matching how the CLI itself
// would fail.
function canBind(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", () => resolve(false));
    probe.listen({ port, host: "127.0.0.1" }, () => {
      probe.close(() => resolve(true));
    });
  });
}

// Pick the port a theme spawn should use. Returns null in the two cases
// where the spawn should stay untouched: the CLI default is free (the
// common single-server case — we still reserve it so a parallel sibling
// spawn skips it), or nothing in the scanned range is free (let the CLI
// fail; the startup log explains).
async function pickShopifyThemePort(): Promise<number | null> {
  for (let i = 0; i <= PORT_SCAN_LIMIT; i++) {
    const port = SHOPIFY_THEME_DEFAULT_PORT + i;
    if (isReservedPort(port)) continue;
    if (!(await canBind(port))) continue;
    recentlyPickedPorts.set(port, Date.now());
    return i === 0 ? null : port;
  }
  return null;
}

// Spawn a dev server for a project. Shared by the Start Dev Server flow
// in the dashboard and by `restartServer` below.
//
// Implementation notes:
// - We launch via `/bin/zsh -ilc` so the user's PATH is loaded. `-l` reads
//   `~/.zprofile`; `-i` reads `~/.zshrc`. Most users put their PATH additions
//   for nvm/bun/pnpm in `~/.zshrc`, so both flags are required. Raycast's
//   GUI-app PATH is otherwise too minimal to find these tools.
// - `cwd` is passed as a spawn option (NOT shell-concatenated) so the path
//   never goes through the shell, removing one injection surface.
// - The package manager, `run`, and the script name are passed as positional
//   args (`$0`/`$@`) rather than interpolated into the command string. zsh
//   re-quotes them, so a script key containing spaces or shell metacharacters
//   can't break or inject; it's just run verbatim.
// - `detached: true` + `unref()` lets the spawned process outlive the
//   extension command's lifetime.
// - The log filename is keyed by a slug of cwd so it stays meaningful after
//   the PID has been replaced by the new server. Use `spawnLogPath(cwd)`
//   to reach it from error toasts.
//
// Throws if planSpawn can't find a runnable command.
export async function startDevServer(cwd: string): Promise<void> {
  const plan = planSpawn(cwd);
  if (!plan) {
    throw new Error(
      "No way to start this project. Expected a package.json with a dev/start/develop script (or one invoking a known dev-server tool), or a Shopify theme/app root.",
    );
  }
  const { cmd, args } = plan;
  // Theme spawns export a pre-picked port when the CLI default is taken;
  // see the port-fallback section above. Applies to bare theme roots and to
  // themes wrapping `shopify theme dev` in a dev script alike.
  const env = { ...process.env };
  if (isShopifyThemeRoot(cwd)) {
    const port = await pickShopifyThemePort();
    if (port !== null) env.SHOPIFY_FLAG_PORT = String(port);
  }
  const out = fs.openSync(spawnLogPath(cwd), "a");
  const child = spawn("/bin/zsh", ["-ilc", 'exec "$0" "$@"', cmd, ...args], {
    cwd,
    env,
    detached: true,
    stdio: ["ignore", out, out],
  });
  // Close our copy of the log fd once the child owns its own dup, so repeated
  // starts/restarts in a long-lived dashboard session don't leak descriptors.
  // We wait for the 'spawn' event rather than closing immediately because
  // libuv dups the fd into the child asynchronously; closing too early could
  // truncate the child's stdio. The 'error' listener covers the spawn-failed
  // path and also keeps a spawn error from throwing as an unhandled event.
  const closeLog = () => {
    try {
      fs.closeSync(out);
    } catch {
      // Already closed / invalid fd; nothing to do.
    }
  };
  child.once("spawn", closeLog);
  child.once("error", closeLog);
  child.unref();
}

// Path of the spawn log for a given cwd. Useful for error toasts that point
// the user at the right file when a spawn appears to fail.
export function spawnLogPath(cwd: string): string {
  return path.join(os.tmpdir(), `dev-servers-spawn-${cwdSlug(cwd)}.log`);
}

// Restart pre-spawn kill: SIGKILL + wait-for-exit. Unlike `killProcess`
// above, this is *not* graceful: the spawn flow needs the listener to
// release its port immediately so the new server can bind it without
// racing. Polling `process.kill(pid, 0)` until ESRCH (max 500ms)
// confirms exit before we return.
//
// Best-effort: any error along the way is swallowed. If the kernel
// refuses to signal the process or it dies between snapshots, the next
// spawn will either succeed cleanly or fail to bind the port, and both
// surface their own errors at the right layer.
//
// Cross-platform: both SIGKILL and signal-0 map cleanly to Windows'
// TerminateProcess / OpenProcess, so this stays portable.
export async function killServer(pid: number): Promise<void> {
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    return;
  }
  const deadline = Date.now() + 500;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
      await new Promise((r) => setTimeout(r, 20));
    } catch {
      return;
    }
  }
}

// Restart a dev server: force-kill the old listener, then spawn a
// replacement via startDevServer.
export async function restartServer(server: DevServer): Promise<void> {
  await killServer(server.pid);
  await startDevServer(server.cwd);
}
