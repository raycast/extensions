import { execFile, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { fetchAliases } from "./aliases";
import { DevServer, Runtime } from "./types";

const execFileRaw = promisify(execFile);

// Every inspection command runs under a deadline and a generous buffer. ps,
// lsof and git normally answer in milliseconds, but lsof can stall on a
// sleeping network volume and git on a FUSE or iCloud folder, and with no
// deadline one stuck child froze the whole list (and kept the menu bar
// spinning) until it gave up on its own, which it might never do. On a
// timeout the child is killed and the error carries whatever it printed, which
// stdoutOrThrow salvages where a partial answer is still useful. The buffer is
// sized for `ps -A -ww` on a busy machine: Node's 1 MB default is within reach
// of a few hundred long command lines.
const EXEC_TIMEOUT_MS = 10_000;
const EXEC_MAX_BUFFER = 32 * 1024 * 1024;

function execFileAsync(
  file: string,
  args: string[],
  options: { timeout?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  return execFileRaw(file, args, {
    timeout: options.timeout ?? EXEC_TIMEOUT_MS,
    maxBuffer: EXEC_MAX_BUFFER,
    encoding: "utf8",
  });
}

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
//   openInBackground → Start-Process (no direct -g equivalent)

// Open a URL in the default browser without focusing it. Deliberately not
// Raycast's `open()`: that activates the browser, and Raycast hides its own
// window the moment it loses focus. For a URL the user asked for that is
// right, but the auto-open on a server binding its port is something the
// extension does on its own, and it should not yank the window out from
// under someone who is still reading it.
//
// `open -g` is the only way to get a background activation on macOS; there
// is no @raycast/api option for it.
export async function openInBackground(url: string): Promise<void> {
  await execFileAsync("/usr/bin/open", ["-g", url]);
}

interface RawProcess {
  pid: number;
  ppid: number; // parent PID; lets detection climb from helper binaries to the dev server that spawned them
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
  // pid= / ppid= / lstart= / command= : suppress headers; output each field
  // as-is. lstart is fixed-width 24 chars (`Tue May 19 20:02:57 2026`).
  const { stdout } = await execFileAsync("ps", [
    "-A",
    "-ww",
    "-o",
    "pid=,ppid=,lstart=,command=",
  ]);
  const procs: RawProcess[] = [];
  for (const line of stdout.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.+)$/);
    if (!match) continue;
    const rest = match[3];
    if (rest.length < 25) continue; // need at least lstart + one char
    procs.push({
      pid: parseInt(match[1], 10),
      ppid: parseInt(match[2], 10),
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

interface ParentInfo {
  ppid: number;
  // Basename of the executable, e.g. "workerd" or "node".
  name: string;
}

// Parent and executable name for a handful of known PIDs. Same field syntax as
// listProcesses, but -p asks only about the pids we care about instead of
// walking the whole table; a pid that died since we learned of it is simply
// absent from the output (ps exits non-zero when none of them are left).
//
// comm is the executable, not the argv line, and on macOS it comes back as an
// absolute path that may well contain spaces
// (`/Users/me/Client Work/app/node_modules/.../bin/workerd`). So the two
// numbers are read off the front of the line and the whole remainder is the
// path, never split on whitespace.
async function listParentInfo(
  pids: number[],
): Promise<Map<number, ParentInfo>> {
  const out = new Map<number, ParentInfo>();
  if (pids.length === 0) return out;
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("ps", [
      // -ww like listProcesses: a truncated path would only fail the name
      // gate closed, but full width costs nothing.
      "-ww",
      "-o",
      "pid=,ppid=,comm=",
      "-p",
      pids.join(","),
    ]));
  } catch (err) {
    stdout = stdoutOrThrow(err);
  }
  for (const line of stdout.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.+)$/);
    if (!match) continue;
    out.set(parseInt(match[1], 10), {
      ppid: parseInt(match[2], 10),
      name: commandBase(match[3].trim()),
    });
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
    const { stdout } = await execFileAsync(
      "git",
      [
        "-C",
        cwd,
        "rev-parse",
        "--git-common-dir",
        "--abbrev-ref",
        "HEAD",
        "--git-path",
        "HEAD",
      ],
      // Short: a branch tag is cosmetic, and a repo that cannot answer in
      // this long is not worth holding the whole list for.
      { timeout: 3_000 },
    );
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
// a Shopify CLI dev process, a known dev server from outside the JS world
// (`python -m http.server`, `rails s`, `php -S`, …), a script an interpreter
// is running out of a project folder, or a binary `go run` / `cargo run` /
// `dotnet run` compiled a moment ago. Over-collection is harmless: only PIDs
// with a LISTEN socket survive the join below. The line this draws is
// "something a person started to serve a project", not "everything that
// listens": Homebrew services, Docker, language servers and the like never
// match a shape here, and that is what keeps the list a list of dev servers.
function isCandidate(proc: RawProcess): boolean {
  if (commandBase(proc.command.split(/\s+/, 1)[0]) === "next-server")
    return true;
  if (/node_modules\//.test(proc.command)) return true;
  if (detectShopifyTool(proc.command)) return true;
  // Everything below only ever matches when the executable is one of a small
  // set of names (an interpreter, a wrapper, a known tool) or a compiled
  // artifact by path. One cheap check on the exec basename skips the whole
  // cascade for the hundreds of system processes that are neither, which is
  // what keeps this affordable on every poll: isCandidate runs over the full
  // `ps -A` table, before any per-pid cache.
  const exec = execBase(proc.command);
  if (exec === "bun") return true;
  if (!CANDIDATE_EXECS.has(exec) && !interpreterRuntime(exec)) {
    return compiledArtifactTool(proc.command) !== null;
  }
  if (detectForeignTool(proc.command)) return true;
  if (compiledArtifactTool(proc.command)) return true;
  return isProjectScript(proc.command);
}

// Lowercased basename of a command line's executable. A trailing colon is
// dropped: Puma and gunicorn rewrite their process title to `puma: cluster
// worker ...` / `gunicorn: master [app]`, and with the colon kept the name
// missed CANDIDATE_EXECS, so those servers were rejected before
// detectForeignTool (which strips it too) ever saw them.
function execBase(command: string): string {
  return commandBase(command.split(/\s+/, 1)[0])
    .toLowerCase()
    .replace(/:$/, "");
}

// The runtime an executable name is, or null when it is not an interpreter:
// `python3.12`, `Python` (macOS framework builds capitalise it), `ruby`,
// `php8`, `node`, `bun`, `deno`, `dotnet`. The one place the interpreter
// names live; every detector below asks this instead of carrying its own
// regex. Takes the lowercased basename from execBase.
function interpreterRuntime(exec: string): Runtime | null {
  if (exec === "node" || exec === "nodejs") return "node";
  if (exec === "bun") return "bun";
  if (exec === "deno") return "deno";
  if (exec === "dotnet") return "dotnet";
  if (/^python(?:\d(?:\.\d+)?)?$/.test(exec)) return "python";
  if (/^ruby(?:\d(?:\.\d+)?)?$/.test(exec)) return "ruby";
  if (/^php(?:\d(?:\.\d+)?)?$/.test(exec)) return "php";
  return null;
}

// The runtime the listening process actually is, read off its executable.
// Distinct from the tool: a Vite server is tool "vite" on runtime "node" (or
// "bun"), Python's http.server is tool "http.server" on runtime "python".
// Interpreters are named; wrappers and compiled tools answer from the tool
// table; compiled artifacts report their language; anything else falls back
// to "node", which is what every node_modules launch is.
function detectRuntime(command: string): Runtime {
  const own = interpreterRuntime(execBase(command));
  if (own) return own;
  const foreign = detectForeignTool(command);
  if (foreign) return foreign.runtime;
  return compiledArtifactTool(command) ?? "node";
}

// Dev servers that live outside node_modules, matched by what the process
// runs rather than by anything the folder is called. Each entry names the
// executable (or a script token reachable through an interpreter, since
// `.venv/bin/flask` runs as `.venv/bin/python .venv/bin/flask run`) plus the
// argument shape that means "serve", so `rails console` and `flask shell`
// stay out. Kept deliberately narrow, on the same principle as the Shopify
// detector: a name a user picked, not any process whose path contains it.
type ForeignMatch = { tool: string; runtime: Runtime };

// Runtime a subcommand token implies when reached through `bundle exec`,
// `poetry run`, `uv run`, `pipenv run`, `pdm run`: the wrapper's runtime is
// the tool's runtime.
const RUNTIME_WRAPPERS: Record<string, Runtime> = {
  bundle: "ruby",
  poetry: "python",
  uv: "python",
  pipenv: "python",
  pdm: "python",
  hatch: "python",
};

// Executable/script names and the argument that must follow for it to be a
// serving command. `null` means any invocation is a server (uvicorn, puma).
// `flag` marks tools whose serving mode is a flag rather than a subcommand
// (`php -S`, `ruby -run -e httpd`).
interface ForeignServer {
  runtime: Runtime;
  serve: RegExp | null;
  tool?: string;
}

const FOREIGN_SERVERS: Record<string, ForeignServer> = {
  // Python. `python -m http.server` is reached through the -m branch below.
  "http.server": { runtime: "python", serve: null },
  SimpleHTTPServer: { runtime: "python", serve: null, tool: "http.server" },
  flask: { runtime: "python", serve: /^run$/ },
  uvicorn: { runtime: "python", serve: null },
  gunicorn: { runtime: "python", serve: null },
  hypercorn: { runtime: "python", serve: null },
  daphne: { runtime: "python", serve: null },
  fastapi: { runtime: "python", serve: /^(?:dev|run)$/ },
  mkdocs: { runtime: "python", serve: /^serve$/ },
  streamlit: { runtime: "python", serve: /^run$/ },
  "manage.py": { runtime: "python", serve: /^runserver/, tool: "django" },
  // Ruby
  rails: { runtime: "ruby", serve: /^(?:s|server)$/ },
  puma: { runtime: "ruby", serve: null },
  rackup: { runtime: "ruby", serve: null },
  jekyll: { runtime: "ruby", serve: /^(?:s|serve)$/ },
  // PHP
  artisan: { runtime: "php", serve: /^serve$/, tool: "laravel" },
  symfony: { runtime: "php", serve: /^server:start$/ },
  // Deno: `deno run|serve|task …` is a server whenever it listens.
  deno: { runtime: "deno", serve: /^(?:run|serve|task)$/ },
  // Launchers whose compiled child is caught by compiledArtifactTool; the
  // launcher itself rarely listens but is the command a restart replays.
  dotnet: { runtime: "dotnet", serve: /^(?:run|watch)$/ },
  go: { runtime: "go", serve: /^run$/ },
  cargo: { runtime: "rust", serve: /^(?:run|watch)$/, tool: "rust" },
  // Static-site and file servers
  hugo: { runtime: "other", serve: /^(?:server|serve)$/ },
  zola: { runtime: "other", serve: /^serve$/ },
  caddy: { runtime: "other", serve: /^(?:file-server|run)$/ },
  miniserve: { runtime: "other", serve: null },
  trunk: { runtime: "rust", serve: /^serve$/ },
  air: { runtime: "go", serve: null },
};

// Executable basenames worth running the detector cascade for: the tool
// names, the wrappers, and the interpreters (answered by interpreterRuntime,
// so not listed here). Anything else on the process table is skipped by
// isCandidate before a single command line is tokenized.
const CANDIDATE_EXECS = new Set<string>([
  ...Object.keys(FOREIGN_SERVERS).map((k) => k.toLowerCase()),
  ...Object.keys(RUNTIME_WRAPPERS),
]);

// Does the serve regex match anywhere in the next few tokens after the tool
// name? Global flags commonly come first (`flask --app hello run`, `rails
// --environment=development server`, `mkdocs -f docs/mkdocs.yml serve`,
// `hugo --source site server`), so the check is not pinned to the very next
// token. Bounded, so a serve verb buried in a long argument list to some
// unrelated subcommand cannot match.
const SERVE_SCAN_TOKENS = 5;

function servesFrom(tokens: string[], from: number, serve: RegExp): boolean {
  const end = Math.min(tokens.length, from + SERVE_SCAN_TOKENS);
  for (let i = from; i < end; i++) {
    if (serve.test(tokens[i])) return true;
  }
  return false;
}

function detectForeignTool(command: string): ForeignMatch | null {
  const tokens = command.trim().split(/\s+/);
  if (tokens.length === 0 || !tokens[0]) return null;
  const exec = execBase(command);
  const execRuntime = interpreterRuntime(exec);

  // `python -m http.server [port]`, `python -m flask run`, `-m uvicorn`,
  // `-m mkdocs serve`, `-m streamlit run`: the module name is the tool.
  if (execRuntime === "python") {
    const m = tokens.indexOf("-m");
    const known =
      m !== -1 && tokens[m + 1] ? FOREIGN_SERVERS[tokens[m + 1]] : undefined;
    if (known && known.runtime === "python") {
      if (known.serve === null || servesFrom(tokens, m + 2, known.serve)) {
        return { tool: known.tool ?? tokens[m + 1], runtime: "python" };
      }
    }
  }
  // Flag-shaped servers, the two that are not "name then subcommand".
  // `ruby -run -e httpd . -p 8000` (WEBrick one-liner); `php -S host:port`.
  if (execRuntime === "ruby" && tokens.includes("httpd")) {
    return { tool: "webrick", runtime: "ruby" };
  }
  if (execRuntime === "php" && tokens.includes("-S")) {
    return { tool: "php", runtime: "php" };
  }

  // Named tool, reached directly or through an interpreter or wrapper. Scan
  // the first few tokens so `python .venv/bin/flask run`, `bundle exec rails
  // s`, `uv run uvicorn app:app` and `.venv/bin/uvicorn app:app` all land.
  // Puma and gunicorn rewrite their process title (`puma: cluster worker 0:
  // 1234 [app]`, `gunicorn: master [app]`), so the name may carry a colon.
  const limit = Math.min(tokens.length, 5);
  for (let i = 0; i < limit; i++) {
    const name = commandBase(tokens[i]).replace(/:$/, "");
    const known = FOREIGN_SERVERS[name];
    if (!known) continue;
    if (known.serve !== null && !servesFrom(tokens, i + 1, known.serve)) {
      continue;
    }
    // Runtime is the interpreter's when it is one, the wrapper's when the
    // tool came through `bundle exec` or `uv run`, else the table's.
    const runtime =
      i === 0
        ? known.runtime
        : (RUNTIME_WRAPPERS[exec] ?? execRuntime ?? known.runtime);
    return { tool: known.tool ?? name, runtime };
  }
  return null;
}

// A binary the toolchain compiled a moment ago and is running for the user:
// `go run` builds into the go-build cache, `cargo run` into target/debug or
// target/release, `dotnet run` into bin/Debug or bin/Release. The path is
// the evidence; the tool is the language.
function compiledArtifactTool(
  command: string,
): "go" | "rust" | "dotnet" | null {
  const exec = command.split(/\s+/, 1)[0];
  if (/\/go-build\d*\/[^ ]*\/exe\//.test(exec)) return "go";
  if (/\/target\/(?:debug|release)\/[^/]+$/.test(exec)) return "rust";
  // `dotnet /path/bin/Debug/net9.0/App.dll`.
  if (
    commandBase(exec) === "dotnet" &&
    /\/bin\/(?:Debug|Release)\/[^ ]+\.dll(?:\s|$)/.test(command)
  ) {
    return "dotnet";
  }
  return null;
}

// Path prefixes under which a script is somebody else's infrastructure, not
// a project the user is serving: system and package-manager installs, the
// per-user Library, plus any dot-directory (`~/.vscode/extensions/…/
// server.py`, `~/.local/…`, `~/.cache/…`), where editors and tools keep the
// servers they run for themselves.
const SYSTEM_SCRIPT_PREFIX =
  /^(?:\/usr\/|\/opt\/|\/System\/|\/Library\/|\/Applications\/|\/nix\/|\/Users\/[^/]+\/Library\/)/;

// `node server.js`, `python app.py`, `ruby app.rb`: an interpreter running a
// script that lives in a project folder. The script is the first argument
// that isn't a flag; it has to look like a source file, and it must not be
// under a system prefix or inside a dot-directory. A relative path is always
// accepted, since only a person in a project folder types one.
function isProjectScript(command: string): boolean {
  const tokens = command.trim().split(/\s+/);
  const runtime = interpreterRuntime(execBase(command));
  if (
    runtime !== "node" &&
    runtime !== "python" &&
    runtime !== "ruby" &&
    runtime !== "php"
  ) {
    return false;
  }
  const args = tokens.slice(1);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("-")) {
      // Flags that take a value: skip it so `-r dotenv/config` or `-W ignore`
      // never reads as the script.
      if (/^(?:-r|--require|--import|--loader|-W|-X|-c|-m|-e|-p)$/.test(arg))
        i++;
      continue;
    }
    if (!/\.(?:[cm]?[jt]s|py|rb|php)$/.test(arg)) return false;
    if (path.isAbsolute(arg)) {
      if (SYSTEM_SCRIPT_PREFIX.test(arg)) return false;
      if (/\/\.[^/]/.test(arg)) return false;
    }
    return true;
  }
  return false;
}

// Resolve the owning package name from a path that goes through
// node_modules. Launchers produce several layouts for the same tool, so this
// parses path segments instead of pattern-matching text:
//   node_modules/.bin/vite                    → vite  (plain shim invocation)
//   node_modules/.bin/../vite/bin/vite.js     → vite  (npm/yarn shims exec
//     their target through a relative path, so the command line keeps `..`)
//   node_modules/.bin/../.pnpm/vite@8.1.3_<peers>/node_modules/vite/bin/vite.js
//                                             → vite  (pnpm virtual store)
//   node_modules/serve/build/main.js          → serve
//   node_modules/@scope/pkg/dist/cli.js       → @scope/pkg
// Returns null when no package name can be derived.
function packageFromModulesPath(token: string): string | null {
  // Collapse `..`/`.` first; that alone reduces the shim-self-exec layout to
  // a plain node_modules/<pkg> path.
  const segments = path.posix.normalize(token).split("/");
  // The pnpm virtual store nests a second node_modules
  // (.pnpm/<pkg>@<version>_<peers>/node_modules/<pkg>/...); the LAST
  // occurrence is the one adjacent to the real package directory.
  const idx = segments.lastIndexOf("node_modules");
  if (idx === -1) return null;
  const next = segments[idx + 1];
  if (!next) return null;
  if (next === ".bin") {
    const shim = segments[idx + 2];
    return shim ? commandBase(shim) : null;
  }
  if (next === ".pnpm") {
    // Virtual-store entry with nothing after it but the versioned dir
    // ("vite@8.1.3_<peers>" or "@sveltejs+kit@2.0.0_<peers>"). Normal pnpm
    // launches carry an inner node_modules and never reach here.
    const dir = segments[idx + 2];
    if (!dir) return null;
    const at = dir.indexOf("@", dir.startsWith("@") ? 1 : 0);
    const name = at === -1 ? dir : dir.slice(0, at);
    return name ? name.replace("+", "/") : null;
  }
  if (next.startsWith("@")) {
    const scoped = segments[idx + 2];
    return scoped ? `${next}/${scoped}` : null;
  }
  return next;
}

function detectToolFromCommand(command: string, cwd: string): string {
  if (commandBase(command.split(/\s+/, 1)[0]) === "next-server") return "next";

  const shopifyTool = detectShopifyTool(command);
  if (shopifyTool) return shopifyTool;

  // The script path is the first token routed through node_modules
  // (typically argv[1] after the runtime executable).
  for (const token of command.split(/\s+/)) {
    if (!token.includes("node_modules/")) continue;
    const name = packageFromModulesPath(token);
    if (!name) continue;
    // SvelteKit runs under vite; promote when svelte.config is present.
    if (name === "vite" && hasSvelteConfig(cwd)) return "sveltekit";
    return name;
  }
  const foreign = detectForeignTool(command);
  if (foreign) return foreign.tool;
  const artifact = compiledArtifactTool(command);
  if (artifact) return artifact;
  // Bare script under an interpreter (no node_modules anywhere in the
  // command): the tool is the runtime itself.
  return detectRuntime(command);
}

// Native platform-binary packages are npm's convention for shipping
// per-OS/per-arch compiled executables: `@cloudflare/workerd-darwin-arm64`,
// `@esbuild/darwin-arm64`, `@rollup/rollup-linux-x64-gnu`,
// `sass-embedded-darwin-arm64`, … A process running one of these is an
// implementation detail of whatever tool spawned it, never a tool the user
// picked — so a name matching this shape is a signal to look at the ancestor
// process instead, and is only ever shown (suffix-stripped) as a last resort.
// The shape is `<os>-<arch>` with an optional libc/ABI tail, anchored to the
// end of the unscoped name.
const PLATFORM_BINARY_RE =
  /(?:^|-)(?:darwin|linux|win32|windows|freebsd|openbsd|netbsd|android|sunos|aix)(?:-(?:arm64|aarch64|x64|x86_64|ia32|arm(?:v7l?)?|riscv64|ppc64(?:le)?|s390x|loong64|mips64(?:el)?|wasm32|universal))?(?:-(?:gnu|musl|msvc|eabi|gnueabihf))?$/;

function unscopedName(name: string): string {
  return name.startsWith("@") ? (name.split("/")[1] ?? name) : name;
}

function isPlatformBinaryName(name: string): boolean {
  return PLATFORM_BINARY_RE.test(unscopedName(name));
}

// "@cloudflare/workerd-darwin-arm64" → "workerd". When the whole unscoped
// name is the platform triple ("@esbuild/darwin-arm64"), fall back to the
// scope itself → "esbuild".
function stripPlatformSuffix(name: string): string {
  const base = unscopedName(name);
  const stripped = base.replace(PLATFORM_BINARY_RE, "");
  if (stripped) return stripped;
  if (name.startsWith("@")) return name.slice(1).split("/")[0];
  return base;
}

// How far to climb the process tree when resolving a helper binary to the
// dev server that owns it. The chain is usually direct (vite → workerd);
// the margin covers an intermediate shell or npm exec layer.
const ANCESTOR_SCAN_DEPTH = 5;

function detectTool(
  proc: RawProcess,
  cwd: string,
  procByPid: Map<number, RawProcess>,
): string {
  const own = detectToolFromCommand(proc.command, cwd);
  if (!isPlatformBinaryName(own)) return own;
  // This process is a compiled helper (workerd, esbuild service, …). The
  // tool the user actually chose is the ancestor that spawned it. cwd is the
  // helper's own, which in practice is the project root the ancestor runs
  // in — good enough for the svelte-config promotion.
  let cur = proc;
  for (let depth = 0; depth < ANCESTOR_SCAN_DEPTH; depth++) {
    const parent = procByPid.get(cur.ppid);
    if (!parent) break;
    if (isCandidate(parent)) {
      const parentTool = detectToolFromCommand(parent.command, cwd);
      if (!isPlatformBinaryName(parentTool)) return parentTool;
    }
    cur = parent;
  }
  return stripPlatformSuffix(own);
}

// A process title rather than a command line. Puma and gunicorn overwrite
// their argv (`puma 6.4.2 (tcp://0.0.0.0:3000) [myapp]`, `gunicorn: master
// [app]`), and what `ps` then prints cannot be run again: it is a status
// line. Parentheses, brackets and a colon-terminated first word are the
// tells; no runnable dev-server command line has them.
function isProcessTitle(command: string): boolean {
  return /[()[\]]/.test(command) || /^\S+:(?:\s|$)/.test(command);
}

// The command line a restart replays when the project has no package.json
// script to run instead (see startDevServer), or undefined when nothing
// replayable is known and a restart must be refused up front rather than
// kill a server it cannot bring back. Usually the process's own line. Two
// exceptions:
//   - a binary `go run` / `cargo run` / `dotnet run` compiled is deleted or
//     stale by the time anyone restarts, so the launcher's command line,
//     found up the tree, is what starts the project again;
//   - a rewritten process title (puma, gunicorn) is not a command at all.
//     The nearest ancestor that is itself a candidate and not a title (a
//     `bundle exec puma` wrapper, `foreman start`) is replayed instead; with
//     none, there is no replay.
function restartCommandFor(
  proc: RawProcess,
  procByPid: Map<number, RawProcess>,
): string | undefined {
  const artifact = compiledArtifactTool(proc.command) !== null;
  const title = isProcessTitle(proc.command);
  if (!artifact && !title) return proc.command;
  let cur = proc;
  for (let depth = 0; depth < ANCESTOR_SCAN_DEPTH; depth++) {
    const parent = procByPid.get(cur.ppid);
    if (!parent) break;
    if (artifact) {
      const tool = detectForeignTool(parent.command)?.tool;
      if (tool === "go" || tool === "rust" || tool === "dotnet") {
        return parent.command;
      }
    } else if (isCandidate(parent) && !isProcessTitle(parent.command)) {
      return parent.command;
    }
    cur = parent;
  }
  return artifact ? proc.command : undefined;
}

function hasSvelteConfig(cwd: string): boolean {
  return (
    fs.existsSync(`${cwd}/svelte.config.js`) ||
    fs.existsSync(`${cwd}/svelte.config.ts`) ||
    fs.existsSync(`${cwd}/svelte.config.mjs`) ||
    fs.existsSync(`${cwd}/svelte.config.cjs`)
  );
}

// A working directory that belongs to an application rather than to a
// project: an app's private state under a dot-directory directly in the home
// folder (`~/.codex/visualizations/…/<uuid>` is where Codex serves its
// visualizations from; `~/.cursor`, `~/.vscode`, `~/.cache`, `~/.local` are
// where editors and tools keep the servers they run for themselves), the
// per-user or system Library, or a system install prefix. A server there is
// somebody's plumbing however it was started, and with no git repo to name it
// by it would render as a row called after a UUID or a version number. Applies
// to every detection kind alike; the node_modules rule is no exception, since
// an editor extension's bundled Vite is exactly this. Only the FIRST segment
// under home is checked, so a dot-directory deeper down (`~/dev/app/.worktrees/
// feature`, `~/.dotfiles`-style repos aside) stays a project.
const TOOL_OWNED_CWD_PREFIX =
  /^(?:\/usr\/|\/opt\/|\/System\/|\/Library\/|\/Applications\/|\/nix\/)/;

function isToolOwnedCwd(cwd: string): boolean {
  if (TOOL_OWNED_CWD_PREFIX.test(cwd)) return true;
  const home = os.homedir();
  if (cwd === home || !cwd.startsWith(home + path.sep)) return false;
  const first = cwd.slice(home.length + 1).split(path.sep, 1)[0];
  return first.startsWith(".") || first === "Library";
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
  runtime: Runtime;
  command: string | undefined;
}
const pidMetaCache = new Map<number, PidMeta>();

// `settlingCwds` names the projects the caller knows to be mid-start, and is
// the evidence for suppressHelperRows' fourth rule (see there). Omit it, or
// pass an empty set, and nothing changes.
export async function fetchServers(
  settlingCwds?: ReadonlySet<string>,
): Promise<DevServer[]> {
  const [procs, listeners, aliasesByPort] = await Promise.all([
    listProcesses(),
    listListeners(),
    fetchAliases(),
  ]);
  const candidates = procs.filter(isCandidate);
  const portByPid = lowestPortPerPid(listeners);
  const live = candidates.filter((p) => portByPid.has(p.pid));
  // Full snapshot keyed by pid, for ancestor walks: resolving helper
  // binaries to the tool that spawned them, and hiding their rows.
  const procByPid = new Map(procs.map((p) => [p.pid, p]));

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
      tool: detectTool(proc, cwd, procByPid),
      runtime: detectRuntime(proc.command),
      command: restartCommandFor(proc, procByPid),
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
  // Where a server works from decides whether it is anyone's project at all;
  // see isToolOwnedCwd. Decided here, before the git pass, so a hidden pid
  // costs no `git rev-parse` either.
  const listed = live.filter((p) => {
    const meta = pidMetaCache.get(p.pid);
    if (!meta) return false;
    if (isToolOwnedCwd(meta.cwd)) return false;
    // A bare script working out of the filesystem root is a daemon (launchd
    // sets cwd to `/` for everything it starts). Only the bare-script rule is
    // held to this: `sudo python -m http.server 80` run from `/` is still a
    // server someone started on purpose, and it keeps its row.
    return !(meta.cwd === "/" && meta.tool === meta.runtime);
  });
  const uniqueCwds = [
    ...new Set(
      listed
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
  for (const proc of listed) {
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
      command: meta.command,
      workerPids: [],
      cwd: meta.cwd,
      projectKey,
      projectName,
      branch: git?.branch || undefined,
      lanExposed: listener.lanExposed,
      startedAt: new Date(proc.lstart),
    });
  }
  // Rule 3's evidence, gathered only when there is a candidate to judge: the
  // executables of orphaned ephemeral-port listeners, from the same targeted
  // `ps -o comm` the reap reads. The full command line cannot answer this
  // question (a project folder named workerd-demo would satisfy any name
  // scan), so the rule goes by what the process actually runs, and pays one
  // extra ps only in the rare poll that has an orphan at all.
  const orphanPids = servers
    .filter((s) => {
      if (parseInt(s.port, 10) < EPHEMERAL_PORT_MIN) return false;
      const self = procByPid.get(s.pid);
      return self !== undefined && self.ppid <= 1;
    })
    .map((s) => s.pid);
  const orphanHelperPids = new Set<number>();
  if (orphanPids.length > 0) {
    for (const [pid, info] of await listParentInfo(orphanPids)) {
      if (REAPABLE_HELPERS.has(info.name)) orphanHelperPids.add(pid);
    }
  }
  return suppressHelperRows(servers, procByPid, orphanHelperPids, settlingCwds);
}

// macOS hands out dynamic ports from this range when a process binds port 0.
// Exported because the dashboard needs the same notion of "not a port anyone
// chose" while a project is mid-restart (see resolvingServer there).
export const EPHEMERAL_PORT_MIN = 49152;

// Drop rows that are internal sockets of an already-listed server, on either
// of two signals. Both require an OS-assigned port, which is the half that
// never lies: nobody picks 51759 on purpose, so a process listening there is
// plumbing. A child bound to a *configured* port stays visible (workerd on
// 8787 under `wrangler dev`, a Hydrogen storefront under `shopify app dev`),
// because a deliberate port is a server someone opens.
//
//   1. Descent. The process is a descendant of another row's process: the
//      plain "helper the dev server forked with port 0" case.
//   2. Same project. Some other row on a deliberate port has this cwd.
//   3. Orphaned helper. Its parent is init AND its executable (by `ps -o
//      comm`, the same evidence the reap reads) is a known leaky helper
//      (REAPABLE_HELPERS), so whatever launched it is dead and it is the
//      kind of process that leaks this way.
//   4. Mid-start. The caller says a start is in flight for this cwd.
//
// Rule 2 exists because rule 1 loses to reparenting. Miniflare's workerd is
// launched by an intermediate process that then exits, so workerd is adopted
// by init and the ancestor walk finds nothing but pid 1. Two of them per
// `vite dev` then showed up as extra servers of the project, and they were
// not merely noisy: Restart on one killed workerd and started a second dev
// server for the same folder, leaving the first running.
//
// Rule 3 exists because rule 2 needs a living server to point at, and the
// nastiest case is the one where there isn't one. A project whose dev server
// died leaves its workerd behind holding an ephemeral port, and that lone
// orphan was rendering as "Simac, 1 server, localhost:57018" — a project
// reported as running when nothing of it was, and a row whose Kill did
// nothing, since orphaned workerd ignores SIGTERM. The name gate is what
// keeps the rule honest: every server this extension starts is spawned
// detached and so is init-parented within seconds, and without the gate a
// dev script that deliberately binds a port >= 49152 was permanently
// invisible on every surface.
//
// Rule 4 is the one we cannot see for ourselves. A project mid-start has a
// window where its helpers are listening and the dev server itself is not, and
// the three rules above all recognise plumbing by a real server they can find:
// there isn't one yet. A pending start row is the missing evidence, so while
// the caller says one is up we refuse ephemeral-port rows for that cwd
// outright. It is bounded by that row's own lifetime, so nothing stays hidden
// once the project settles, and a caller that knows nothing about starts in
// flight passes nothing and gets the other three rules unchanged.
//
// What survives all four is an ephemeral-port listener that no rule can tie
// to a shown server or to a known leaky helper: somebody's own tool, which
// we have no business hiding.
function suppressHelperRows(
  servers: DevServer[],
  procByPid: Map<number, RawProcess>,
  orphanHelperPids: ReadonlySet<number>,
  settlingCwds?: ReadonlySet<string>,
): DevServer[] {
  const shownPids = new Set(servers.map((s) => s.pid));
  // Projects that already have a server on a port someone chose. An
  // ephemeral-port process sharing one of these cwds is that server's
  // plumbing, whatever became of its parent.
  const anchoredCwds = new Set(
    servers
      .filter((s) => parseInt(s.port, 10) < EPHEMERAL_PORT_MIN)
      .map((s) => s.cwd),
  );
  const byPid = new Map(servers.map((s) => [s.pid, s]));
  return servers.filter((server) => {
    if (parseInt(server.port, 10) < EPHEMERAL_PORT_MIN) {
      // A deliberate port is a server someone opens, with one exception: a
      // descendant holding the SAME port as a shown ancestor is that
      // ancestor's worker, not a second server. Reloading supervisors work
      // this way (uvicorn --reload, gunicorn, puma clustered: the parent
      // binds and the children inherit the socket), and one row per port is
      // the honest count. The ancestor is the row that stays because it is
      // the one a Kill must reach; killing a worker just gets it respawned.
      // The worker's pid is folded into the ancestor's row so a kill of the
      // row takes the workers with it: a SIGKILLed master cannot clean up
      // after itself, and a worker left holding the inherited socket would
      // keep the port bound with no row left to reach it by.
      // Attached to the FARTHEST same-port ancestor in range, since that is
      // the one whose own walk finds nothing above it and so survives; a
      // nearer one is itself a worker about to be folded away.
      let cur = procByPid.get(server.pid);
      let top: DevServer | undefined;
      for (let depth = 0; depth < ANCESTOR_SCAN_DEPTH && cur; depth++) {
        cur = procByPid.get(cur.ppid);
        const ancestor = cur && byPid.get(cur.pid);
        if (ancestor && ancestor.port === server.port) top = ancestor;
      }
      if (!top) return true;
      top.workerPids.push(server.pid);
      return false;
    }
    if (anchoredCwds.has(server.cwd)) return false;
    if (settlingCwds?.has(server.cwd)) return false;
    // Orphaned alone is not enough: every server this extension starts is
    // spawned detached, so init is its parent the moment the command that
    // launched it unloads, and a dev script that deliberately picks a port
    // >= 49152 (vitest --ui defaults to one) would be a running server no
    // surface could see. Same lesson the reap learned: a victim must be
    // NAMED, not merely look abandoned. Membership was decided by the
    // caller from `ps -o comm` (see fetchServers), so being in the set
    // already means orphaned AND running a known leaky helper.
    if (orphanHelperPids.has(server.pid)) return false;
    const self = procByPid.get(server.pid);
    let cur = self;
    for (let depth = 0; depth < ANCESTOR_SCAN_DEPTH && cur; depth++) {
      cur = procByPid.get(cur.ppid);
      if (cur && shownPids.has(cur.pid)) return false;
    }
    return true;
  });
}

// Newest first. Shared by the dashboard and the menu bar so the same servers
// never appear in two different orders on two surfaces.
//
// `ps` hands back PID order, which only loosely tracks start time and wraps
// around, so a server started an hour ago can outrank one started seconds
// ago. PID breaks ties on purpose: `ps lstart` resolves only to the second, so
// starting several at once produces identical timestamps, and a comparator
// returning 0 there would leave those rows free to swap places on every poll.
// An unparseable lstart yields NaN, which is falsy, so it also falls through
// to PID rather than ordering at random.
export function byRecency(a: DevServer, b: DevServer): number {
  return b.startedAt.getTime() - a.startedAt.getTime() || b.pid - a.pid;
}

// User-initiated kill: SIGTERM (the default signal), graceful: the
// dev server gets a chance to flush logs, close connections, etc. Use
// this from the dashboard's Kill / Kill All flows. Pair with `killServer`
// below when you need an *immediate* port release (e.g. restart).
//
// Async-shaped so callers can pass the returned promise to Raycast's
// `mutate(fn, { optimisticUpdate })` flow. `process.kill` itself is sync.
// `workers` are the same-port descendants folded into the row
// (DevServer.workerPids). A supervisor asked nicely shuts its workers down
// itself; signalling them too is harmless and covers the ones that do not.
export async function killProcess(
  pid: number,
  workers: readonly number[] = [],
): Promise<void> {
  process.kill(pid);
  for (const w of workers) {
    try {
      process.kill(w);
    } catch {
      // Already gone with its parent.
    }
  }
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

// True when the path exists and is a directory. Used to prune recents whose
// project folder was deleted (e.g. a removed git worktree) from both the Start
// picker and the menu bar, so a stale entry doesn't linger in either list.
export function directoryExists(dir: string): boolean {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
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
// Whether the extension knows how to start this folder cold: a package.json
// dev script or a Shopify root. What the recents feed and the Start picker
// mean by "startable"; a running server whose folder fails this is listed
// but not remembered as a project to start later.
export function canPlanStart(cwd: string): boolean {
  return planSpawn(cwd) !== null;
}

// ---------------------------------------------------------------------------
// Dependency install
// ---------------------------------------------------------------------------
//
// A Node project whose node_modules folder is gone (deleted to free space, a
// fresh clone, a worktree nobody installed) cannot start: `npm run dev` finds
// the script and then dies on "vite: command not found". Nothing about how we
// launch it can help, so the start flow checks for this up front and offers
// to install first instead of failing 15 seconds later with nothing to say.

// Where an install for this project runs, and with which package manager. A
// workspace package keeps its lockfile (and usually its node_modules) at the
// workspace root, so the install belongs there: `npm install` inside a pnpm
// workspace's package would build a second, wrong tree. The nearest folder
// holding a lockfile wins, searched up to the repository root; with none, the
// project folder and npm.
export interface InstallPlan {
  pm: PackageManager;
  dir: string;
}

const LOCKFILES = [
  "bun.lockb",
  "bun.lock",
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
];

// The folders an install check walks: the project, then each parent up to and
// including the repository root (the first folder holding `.git`). Never the
// home folder or the filesystem root, where a stray node_modules or lockfile
// belongs to nothing in particular.
function projectAncestors(cwd: string): string[] {
  const home = os.homedir();
  const out: string[] = [];
  let dir = cwd;
  for (;;) {
    if (dir === home || path.dirname(dir) === dir) break;
    out.push(dir);
    if (fs.existsSync(path.join(dir, ".git"))) break;
    dir = path.dirname(dir);
  }
  return out;
}

export function installPlanFor(cwd: string): InstallPlan {
  for (const dir of projectAncestors(cwd)) {
    if (LOCKFILES.some((f) => fs.existsSync(path.join(dir, f)))) {
      return { pm: detectPackageManager(dir), dir };
    }
  }
  return { pm: detectPackageManager(cwd), dir: cwd };
}

function hasInstalledTree(dir: string): boolean {
  // Yarn Plug'n'Play installs without a node_modules folder at all.
  if (fs.existsSync(path.join(dir, ".pnp.cjs"))) return true;
  try {
    // An empty folder is what some cleanup tools leave behind.
    return fs.readdirSync(path.join(dir, "node_modules")).length > 0;
  } catch {
    return false;
  }
}

// The install this project needs before it can start, or null when it needs
// none: not started through a package.json script (a bare Shopify theme), no
// dependencies declared, or an installed tree in the project or any folder up
// to its repository root (hoisted workspaces install at the root). Sync and
// cheap: one package.json read and a few stats.
export function missingDependencies(cwd: string): InstallPlan | null {
  if (!pickDevScript(cwd)) return null;
  let pkg: { dependencies?: unknown; devDependencies?: unknown };
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
  } catch {
    return null;
  }
  const declares = (deps: unknown) =>
    typeof deps === "object" && deps !== null && Object.keys(deps).length > 0;
  if (!declares(pkg.dependencies) && !declares(pkg.devDependencies)) {
    return null;
  }
  if (projectAncestors(cwd).some(hasInstalledTree)) return null;
  return installPlanFor(cwd);
}

// Lines the install wrapper writes into the spawn log around the install, so
// a failed row can tell an install that broke from a dev server that broke
// after a good install (see diagnoseSpawnFailure in the dashboard).
export const INSTALL_DONE_MARKER = "[Dev Servers] Dependencies installed.";
// Printed when the install exits non-zero. The dashboard watches for it so a
// broken install fails its row in seconds rather than at the end of the
// install's generous window.
export const INSTALL_FAILED_MARKER =
  "[Dev Servers] Installing dependencies failed.";

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
// `replay` is a command line to run instead of planning one: the line the
// server being restarted was running (see restartReplay, which decides when
// a restart hands one over). It is `ps` output, argv joined by spaces, so it
// is split on whitespace and passed positionally exactly like the planned
// form; an argument that itself contained a space comes apart into two, but
// nothing in it is ever re-interpreted by the shell. In practice a dev
// server's command line is a binary and a handful of flags, and it is
// exactly what the user typed.
//
// Throws if neither `replay` nor planSpawn yields a runnable command.
export async function startDevServer(
  cwd: string,
  replay?: string,
  options: { install?: InstallPlan } = {},
): Promise<void> {
  // Clear anything the project's last run left behind before adding to it.
  // Helpers outlive the server that spawned them, so a project killed hours
  // ago can still be holding ports, and this is the only moment we can be
  // sure they are stale. Backs out on its own if a real server for this cwd
  // is still listening, so starting a second server beside a running one
  // disturbs nothing.
  await reapProjectHelpers(cwd);
  const plan = replay
    ? { cmd: "", args: replayArgv(replay, cwd) }
    : planSpawn(cwd);
  if (!plan) {
    throw new Error(
      "No way to start this project. Expected a package.json with a dev/start/develop script (or one invoking a known dev-server tool), or a Shopify theme/app root.",
    );
  }
  // Positional args in both forms, so zsh re-quotes them (see below). For a
  // replay the executable is simply the first token.
  const argv = plan.cmd ? [plan.cmd, ...plan.args] : plan.args;
  // With an install, the same shell runs it first, in the install's own folder
  // (a workspace root, possibly), and goes on to the dev server only if it
  // succeeded. Same positional discipline as the plain form: the folder and
  // the package manager arrive as $1 and $2 and are shifted off before the
  // dev command is exec'd, so nothing is spliced into the script text. The
  // marker lines land in the spawn log, where they tell a failed install
  // apart from a server that failed after a good one.
  const install = options.install;
  // Two packages of one workspace started together share an install folder,
  // and two installs writing one node_modules at once corrupt it. lockf (in
  // macOS base) queues the second behind the first on a lock file keyed by
  // the folder; by the time it runs, the tree is in place and the install is
  // a quick no-op.
  const shellArgs = install
    ? [
        "-ilc",
        'print -r -- "[Dev Servers] Installing dependencies: $2 install in $1"' +
          ' && { (cd -- "$1" && /usr/bin/lockf -k "$3" "$2" install) ||' +
          ` { print -r -- ${JSON.stringify(INSTALL_FAILED_MARKER)}; exit 1; } }` +
          ` && print -r -- ${JSON.stringify(INSTALL_DONE_MARKER)}` +
          ' && shift 3 && exec "$@"',
        "dev-servers",
        install.dir,
        install.pm,
        path.join(
          os.tmpdir(),
          `dev-servers-install-${cwdSlug(install.dir)}.lock`,
        ),
        ...argv,
      ]
    : ["-ilc", 'exec "$0" "$@"', ...argv];
  // Theme spawns export a pre-picked port when the CLI default is taken;
  // see the port-fallback section above. Applies to bare theme roots and to
  // themes wrapping `shopify theme dev` in a dev script alike.
  const env = { ...process.env };
  if (isShopifyThemeRoot(cwd)) {
    const port = await pickShopifyThemePort();
    if (port !== null) env.SHOPIFY_FLAG_PORT = String(port);
  }
  const out = fs.openSync(spawnLogPath(cwd), "a");
  const child = spawn("/bin/zsh", shellArgs, {
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

// Split a recorded command line back into arguments. `ps` joins argv with
// single spaces, so an argument that held a space (a project in `~/Client
// Work`, a venv inside it) comes out as two tokens, and running those would
// fail after the restart had already killed the working server. Paths are the
// arguments that realistically contain spaces, and a path can be checked: a
// token that looks like one but does not exist is joined with the tokens after
// it for as long as that produces a path that does. Anything else stays split
// on whitespace, which is what every other argument of a dev server's command
// line is.
const REPLAY_JOIN_LIMIT = 8;

function replayArgv(command: string, cwd: string): string[] {
  const tokens = command.trim().split(/\s+/);
  const exists = (p: string) => {
    if (!/[/~]/.test(p)) return false;
    // A path may sit inside a flag (`--root=/Users/me/Client Work`).
    const bare = p.replace(/^--?[\w-]+=/, "");
    const abs = bare.startsWith("~")
      ? path.join(os.homedir(), bare.slice(1))
      : path.resolve(cwd, bare);
    return fs.existsSync(abs);
  };
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    if (/[/~]/.test(token) && !exists(token)) {
      for (
        let j = i + 1;
        j < tokens.length && j - i <= REPLAY_JOIN_LIMIT;
        j++
      ) {
        const joined = tokens.slice(i, j + 1).join(" ");
        if (exists(joined)) {
          token = joined;
          i = j;
          break;
        }
      }
    }
    out.push(token);
  }
  return out;
}

// Path of the spawn log for a given cwd. Useful for error toasts that point
// the user at the right file when a spawn appears to fail.
export function spawnLogPath(cwd: string): string {
  return path.join(os.tmpdir(), `dev-servers-spawn-${cwdSlug(cwd)}.log`);
}

// A path with the home folder shortened to ~, for display.
export function tildePath(p: string): string {
  const home = os.homedir();
  return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
}

// Size of the (append-mode) spawn log before an attempt writes to it. Taken
// right before every spawn so the watchdog and the log view can scope
// themselves to that attempt's bytes alone.
export function spawnLogOffset(cwd: string): number {
  try {
    return fs.statSync(spawnLogPath(cwd)).size;
  } catch {
    // No log yet; the spawn writes from byte 0.
    return 0;
  }
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
//
// `workers` (DevServer.workerPids) die with the parent. SIGKILL gives the
// supervisor no chance to take its workers down, and a worker holding the
// inherited listening socket would keep the port bound after the row is
// gone; so they are signalled here, after the parent so none is respawned.
export async function killServer(
  pid: number,
  workers: readonly number[] = [],
): Promise<void> {
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    return;
  } finally {
    for (const w of workers) {
      try {
        process.kill(w, "SIGKILL");
      } catch {
        // Already gone.
      }
    }
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

// Who is listening, and out of which folder. One pair of lsof calls, taken
// once and handed to every cwd a reap looks at, so waiting on four projects
// costs the same sweep as waiting on one.
interface ListenerSnapshot {
  listeners: RawListener[];
  cwdByPid: Map<number, string>;
}

async function snapshotListeners(): Promise<ListenerSnapshot> {
  const listeners = await listListeners();
  // listCwds skips its own lsof on an empty pid list, so no guard needed here.
  const cwdByPid = await listCwds([...new Set(listeners.map((l) => l.pid))]);
  return { listeners, cwdByPid };
}

// Executable names the reap may kill, matched against the basename of the
// victim's own executable. One entry, because workerd is the only helper ever
// seen leaking a port-holding orphan; a future one that leaks the same way gets
// its name added here. See reapHelpersFromSnapshot for why the name matters.
const REAPABLE_HELPERS = new Set(["workerd"]);

// Kill the ephemeral-port helpers a dead dev server left behind, judging the
// project by a snapshot the caller took. Returns false, having touched
// nothing, when the project is still up; see below.
//
// Killing the dev server does not take them with it. Miniflare's workerd is
// launched by an intermediate process that then exits, so workerd is adopted
// by init: it is nobody's child by the time we signal anything, and it holds
// its port until the machine restarts. Restarting a project therefore piled
// up two more every time, and they were not merely idle. They are only hidden
// from the list while a real server for that project is listening (see
// suppressHelperRows), which is exactly what a restart briefly takes away, so
// the whole accumulated pile surfaced in the gap between the old server dying
// and the new one binding. Reaping is what stops the pile existing.
//
// Only with the project down. If anything is still serving this cwd on a
// deliberate port, we touch nothing: that server owns helpers we have no way
// of telling apart from these. That is what the false return says, and a
// caller that has just killed the project reads it as "not down yet, ask
// again".
//
// And only orphans die. Sharing a cwd is not enough to make a process ours:
// a standalone `vitest --ui` or a throwaway `http.createServer(0)` script,
// started from the project folder and still parented by the shell that ran
// it, is somebody's own tool, and killing it on the way to a spawn the user
// asked for would be indefensible. That is the same judgment
// suppressHelperRows makes about what it declines to hide. It costs us
// nothing: every helper we exist to remove is by definition an orphan, since
// unix reparents to init the instant a parent exits, including the parent we
// killed a few milliseconds ago.
//
// And only these executables. The full victim test is cwd, plus an OS-assigned
// port, plus orphaned, plus a name in REAPABLE_HELPERS, because the first three
// are coincidences a tool of the user's own can hit together: anything nohup'd
// or daemonized from the project folder is init-parented too, and an
// OS-assigned port is what any script that binds 0 gets. The reap exists for
// workerd, and nothing else has ever been observed leaking an init-orphan that
// holds a port, so we go by the name rather than by a guess at intent.
async function reapHelpersFromSnapshot(
  cwd: string,
  { listeners, cwdByPid }: ListenerSnapshot,
): Promise<boolean> {
  const mine = listeners.filter((l) => cwdByPid.get(l.pid) === cwd);
  if (mine.some((l) => l.port < EPHEMERAL_PORT_MIN)) return false;
  const candidates = [...new Set(mine.map((l) => l.pid))];
  // Nothing to signal, so skip the ps call and the SIGTERM grace wait below.
  // This is the common case: most projects have no helpers, and every spawn
  // reaps first.
  if (candidates.length === 0) return true;
  // Keep only the named helpers that nothing is parenting. A pid that has gone
  // away since the lsof is absent here and drops out with them, which is right:
  // there is nothing left to signal.
  const infoByPid = await listParentInfo(candidates);
  const pids = candidates.filter((pid) => {
    const info = infoByPid.get(pid);
    return (
      info !== undefined && info.ppid <= 1 && REAPABLE_HELPERS.has(info.name)
    );
  });
  if (pids.length === 0) return true;
  // Ask politely first: a helper that still has its wits about it should
  // get to close its sockets.
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Already gone, or not ours to signal. Either way, nothing to do.
    }
  }
  // Then insist. An orphaned workerd ignores SIGTERM outright: its shutdown
  // path wants the supervisor that launched it, and that process is exactly
  // what died to orphan it. Verified on a live one, which sat through
  // SIGTERM and went down on SIGKILL. Without this the reap silently no-ops
  // against the very processes it exists to remove, and worse, it does so
  // only sometimes: a helper orphaned seconds ago still answers.
  await new Promise((r) => setTimeout(r, 300));
  for (const pid of pids) {
    try {
      process.kill(pid, 0);
      process.kill(pid, "SIGKILL");
    } catch {
      // Signal 0 threw, so it is already gone. Nothing to escalate to.
    }
  }
  return true;
}

// Reap a project's helpers right now, or not at all. For the pre-spawn path,
// where the project is expected to be down already and any waiting would be
// dead latency on every start: if a server is still listening for this cwd we
// simply leave its plumbing alone, which is also what makes starting a second
// server beside a running one safe.
export async function reapProjectHelpers(cwd: string): Promise<void> {
  try {
    await reapHelpersFromSnapshot(cwd, await snapshotListeners());
  } catch {
    // Reaping is hygiene layered on top of the kill or spawn the user asked
    // for. A failure here must never surface as a failed kill or restart.
  }
}

// Up to ~1.5s of waiting, in rounds this far apart. A SIGTERMed Vite or
// wrangler releases its port in well under a second; anything slower than the
// whole budget is a server we are better off not reaping under.
const REAP_WAIT_ROUNDS = 6;
const REAP_WAIT_INTERVAL_MS = 300;

// Reap several projects' helpers once each project is actually down.
//
// For the kill paths. The dashboard's Kill is a bare SIGTERM that returns the
// instant the signal is delivered, so the dev server is still holding its port
// when we get control back, and a reap taken at that moment sees a live server
// and declines. Polling is what closes that gap: each round takes one snapshot
// for all the folders still waiting, reaps the ones that have gone quiet, and
// leaves the rest for the next round. A cwd still on a deliberate port when
// the budget runs out is left alone, exactly as a single immediate attempt
// would have left it.
export async function reapProjectHelpersWhenDown(
  cwds: string[],
): Promise<void> {
  const pending = new Set(cwds);
  if (pending.size === 0) return;
  try {
    for (let round = 0; round < REAP_WAIT_ROUNDS && pending.size > 0; round++) {
      if (round > 0) {
        await new Promise((r) => setTimeout(r, REAP_WAIT_INTERVAL_MS));
      }
      const snapshot = await snapshotListeners();
      const done = await Promise.all(
        [...pending].map(async (cwd) =>
          (await reapHelpersFromSnapshot(cwd, snapshot)) ? cwd : null,
        ),
      );
      for (const cwd of done) if (cwd !== null) pending.delete(cwd);
    }
  } catch {
    // Same contract as reapProjectHelpers: hygiene, never a failed kill.
  }
}

// Restart a dev server: force-kill the old listener, then spawn a
// replacement. The helpers it left behind are reaped by startDevServer, which
// now does that for every spawn path; the kill has to come first for that
// reap to see the project as down.
export async function restartServer(server: DevServer): Promise<void> {
  const replay = restartReplay(server);
  await killServer(server.pid, server.workerPids);
  await startDevServer(server.cwd, replay);
}

// What a restart of this server should run, decided BEFORE anything is
// killed: the recorded command line, or undefined to let startDevServer plan
// from package.json / a Shopify root. Throws when neither exists, so a server
// that cannot be brought back is never taken down in the first place.
//
// The recorded line wins for anything that is not a Node/Bun server: a
// Django or Rails app that also carries a package.json for its asset build
// must come back as itself, not as `npm run dev`. For Node/Bun servers the
// package.json script is the project's stated intent and wins over however
// the last server was started; the recorded line is only the fallback for a
// bare `node server.js` in a folder with no dev script.
//
// A non-JS server with no recorded line is refused even when the folder has
// a dev script. That script belongs to something else (the asset build next
// to a Puma app), and running it would kill the app and bring back only the
// asset server.
export function restartReplay(server: DevServer): string | undefined {
  const js = server.runtime === "node" || server.runtime === "bun";
  if (js && planSpawn(server.cwd) !== null) return undefined;
  if (server.command) {
    // Checked here, before the kill, rather than discovered after it: an
    // executable given by path that still does not exist once replayArgv has
    // rejoined split arguments means the line cannot be run again, and the
    // working server must be left alone. A bare name (`rails`, `php`) is
    // resolved by the login shell's PATH and passes.
    const exe = replayArgv(server.command, server.cwd)[0];
    if (exe.includes("/") && !fs.existsSync(path.resolve(server.cwd, exe))) {
      throw new Error(
        `Can't restart ${server.tool}: its command line can't be run again as recorded (${exe} was not found). Kill it and start it from your terminal.`,
      );
    }
    return server.command;
  }
  // No command is recorded only when the process rewrote its title into a
  // status line (see restartCommandFor), so that is the reason to give.
  throw new Error(
    `Can't restart ${server.tool}: it rewrote its command line, so there is nothing to run again, and the folder has no dev script to plan from. Kill it and start it from your terminal.`,
  );
}
