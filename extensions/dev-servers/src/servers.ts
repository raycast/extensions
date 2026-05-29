import { execFile, spawn } from "node:child_process";
import * as fs from "node:fs";
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
      const port = parseInt(addr.slice(addr.lastIndexOf(":") + 1), 10);
      if (port > 0) out.push({ pid: currentPid, port });
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

// Resolve git common-dir and branch for a cwd. Returns undefined when cwd
// isn't inside a git working tree. One process spawn per call.
async function getGitInfo(cwd: string): Promise<GitInfo | undefined> {
  try {
    const { stdout } = await execFileAsync("git", [
      "-C",
      cwd,
      "rev-parse",
      "--git-common-dir",
      "--abbrev-ref",
      "HEAD",
    ]);
    const [commonDirRaw, branchRaw] = stdout.trim().split("\n");
    if (!commonDirRaw) return undefined;
    const commonDir = path.isAbsolute(commonDirRaw)
      ? commonDirRaw
      : path.resolve(cwd, commonDirRaw);
    const branch = branchRaw === "HEAD" ? "" : (branchRaw ?? "");
    return { commonDir, branch };
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Pure aggregation (cross-platform)
// ---------------------------------------------------------------------------

// A candidate is anything launched from node_modules (broader than .bin/ so
// we catch `node node_modules/serve/build/main.js` etc.) OR a bare bun
// process. Over-collection is harmless: only PIDs with a LISTEN socket
// survive the join below.
function isCandidate(proc: RawProcess): boolean {
  if (/node_modules\//.test(proc.command)) return true;
  const exec = proc.command.split(/\s+/, 1)[0];
  return /(\/|^)bun$/.test(exec);
}

function detectRuntime(command: string): "node" | "bun" {
  const exec = command.split(/\s+/, 1)[0];
  return /(\/|^)bun$/.test(exec) ? "bun" : "node";
}

function detectTool(command: string, cwd: string): string {
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
function lowestPortPerPid(listeners: RawListener[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const { pid, port } of listeners) {
    const cur = out.get(pid);
    if (cur === undefined || port < cur) out.set(pid, port);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchServers(): Promise<DevServer[]> {
  const [procs, listeners, aliasesByPort] = await Promise.all([
    listProcesses(),
    listListeners(),
    fetchAliases(),
  ]);
  const candidates = procs.filter(isCandidate);
  const portByPid = lowestPortPerPid(listeners);
  // Only query cwds for candidates that are actually listening, which keeps the
  // lsof argument list short and skips dead PIDs.
  const finalPids = candidates
    .map((p) => p.pid)
    .filter((pid) => portByPid.has(pid));
  const cwdByPid = await listCwds(finalPids);

  // Look up git info per unique cwd, in parallel. Worktrees of the same repo
  // share a git common-dir, so we use that path as the project key, which collapses
  // sibling worktrees into one group while still letting us show the branch on
  // each row. The project's display name is the basename of the common-dir's
  // parent (the repo root).
  const uniqueCwds = [...new Set([...cwdByPid.values()])];
  const gitByCwd = new Map<string, GitInfo | undefined>();
  await Promise.all(
    uniqueCwds.map(async (cwd) => gitByCwd.set(cwd, await getGitInfo(cwd))),
  );

  const servers: DevServer[] = [];
  for (const proc of candidates) {
    const port = portByPid.get(proc.pid);
    if (port === undefined) continue;
    const cwd = cwdByPid.get(proc.pid);
    if (!cwd) continue; // shouldn't happen for live processes, but be safe
    const tool = detectTool(proc.command, cwd);
    // Drop the portless proxy daemon itself. It's a node process out of
    // node_modules/portless/ that binds 80/443/1355, and would otherwise
    // appear as a phantom "dev server" row. Child processes spawned by
    // portless run their own framework binary (next, vite, …) so they
    // resolve to that tool, not "portless".
    if (tool === "portless") continue;
    const git = gitByCwd.get(cwd);
    // For git projects: key is the shared .git dir path (stable across all
    // worktrees of the repo), name is the basename of its parent (the repo
    // root). For non-git: both fall back to the worktree itself.
    const projectName = git
      ? path.basename(path.dirname(git.commonDir))
      : path.basename(cwd) || cwd;
    const projectKey = git ? git.commonDir : cwd;
    const customUrls = aliasesByPort.get(port);
    const localUrl = `http://localhost:${port}`;
    servers.push({
      pid: proc.pid,
      port: String(port),
      url: customUrls?.[0] ?? localUrl,
      localUrl,
      customUrls,
      tool,
      runtime: detectRuntime(proc.command),
      cwd,
      projectKey,
      projectName,
      branch: git?.branch || undefined,
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

// Walk up from a filesystem path to the nearest directory containing a
// package.json. Used to resolve a Finder selection (which may be a file, a
// subfolder, or the project root itself) to a project root we can spawn in.
// The returned path is canonicalized so it round-trips through process
// inspection without symlink-induced mismatches. Returns null when the
// path isn't inside any Node project.
export function findProjectRoot(startPath: string): string | null {
  let cur: string;
  try {
    const st = fs.statSync(startPath);
    cur = st.isDirectory() ? startPath : path.dirname(startPath);
  } catch {
    return null;
  }
  for (;;) {
    if (fs.existsSync(path.join(cur, "package.json"))) return canonicalCwd(cur);
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

// Slugify cwd for use in a temp-dir log filename.
function cwdSlug(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "root";
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
// Throws if pickDevScript can't find a runnable script.
export async function startDevServer(cwd: string): Promise<void> {
  const script = pickDevScript(cwd);
  if (!script) {
    throw new Error(
      "No dev script found in package.json. Expected one of: dev, start, develop, or a script that invokes a known dev-server tool.",
    );
  }
  const pm = detectPackageManager(cwd);
  const [cmd, baseArgs] = PM_RUN[pm];
  const args = [...baseArgs, script];
  const out = fs.openSync(spawnLogPath(cwd), "a");
  const child = spawn("/bin/zsh", ["-ilc", 'exec "$0" "$@"', cmd, ...args], {
    cwd,
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
