// Zero @raycast/api imports here on purpose: this module runs under plain
// `node --test`, mirroring server/proc.js's seam style in the main repo.
// Raycast-only concerns (getPreferenceValues, open(), Toast) live in
// raycast-glue.ts.

import * as os from "node:os";
import * as path from "node:path";
import * as net from "node:net";
import type { ChildProcess, SpawnOptions } from "node:child_process";
import { promises as fsp, existsSync as nodeExistsSync } from "node:fs";
import crossSpawn from "cross-spawn";

export interface ShowmdPrefs {
  showmdPath?: string;
  port?: string;
  reuseServer?: boolean;
}

export type SpawnFn = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => ChildProcess;
export type FetchFn = typeof fetch;
export type ReadFileFn = (filePath: string) => Promise<string>;
export type WriteFileFn = (filePath: string, contents: string) => Promise<void>;
export type ReadDirFn = (dirPath: string) => Promise<string[]>;
export type SleepFn = (ms: number) => Promise<void>;
export type PickPortFn = (signal?: AbortSignal) => Promise<number>;

export interface Deps {
  fetchImpl?: FetchFn;
  spawnImpl?: SpawnFn;
  readFile?: ReadFileFn;
  writeFile?: WriteFileFn;
  readDir?: ReadDirFn;
  platform?: NodeJS.Platform;
  homedir?: () => string;
  env?: NodeJS.ProcessEnv;
  sleepImpl?: SleepFn;
  pickPort?: PickPortFn;
  pickPortTimeoutMs?: number;
  existsSync?: (path: string) => boolean;
}

interface ResolvedDeps {
  fetchImpl: FetchFn;
  spawnImpl: SpawnFn;
  readFile: ReadFileFn;
  writeFile: WriteFileFn;
  readDir: ReadDirFn;
  platform: NodeJS.Platform;
  homedir: () => string;
  env: NodeJS.ProcessEnv;
  sleepImpl: SleepFn;
  pickPort: PickPortFn;
  pickPortTimeoutMs: number;
  existsSync: (path: string) => boolean;
}

// Asks the OS for a free port by binding to :0, reading it back, then
// releasing it. Cold-spawning the CLI without this means the extension has
// to rediscover whatever port the CLI fell back to (a settings.json read,
// which the released CLI floor does not even write) — an explicit --port on
// spawn (see spawnShowmdArgs) sidesteps that discovery race entirely: the
// extension already knows the port before the process exists.
export function pickFreePort(
  signal?: AbortSignal,
  createServer: () => net.Server = () => net.createServer(),
): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    let settled = false;
    const finish = (err?: Error, port?: number) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      if (err) reject(err);
      else resolve(port as number);
    };
    const onAbort = () => {
      try {
        srv.close();
      } catch {
        // The listener may not have reached the listening state yet.
      }
      finish(new Error("timed out while choosing a free port"));
    };
    srv.unref();
    srv.once("error", (err) => finish(err));
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }
    srv.listen(0, "127.0.0.1", () => {
      if (settled) {
        try {
          srv.close();
        } catch {
          // The abort path may already have closed it.
        }
        return;
      }
      const address = srv.address();
      const port = address && typeof address === "object" ? address.port : null;
      srv.close(() => {
        if (port) finish(undefined, port);
        else finish(new Error("could not determine a free port"));
      });
    });
  });
}

function defaultPickPort(signal?: AbortSignal): Promise<number> {
  return pickFreePort(signal);
}

const DEFAULT_PORT = 4321;
const PROBE_TIMEOUT_MS = 350;
const REQUEST_TIMEOUT_MS = 5000;
const PICK_PORT_TIMEOUT_MS = 2000;

// A broken shebang (`env: node: No such file or directory`) exits the child
// right after 'spawn' fires, not before — long enough to cover that dies-
// right-after-spawn window without stalling a healthy launch noticeably.
const SPAWN_GRACE_MS = 400;
const STDERR_TAIL_CHARS = 2048;

export function urlForPort(port: number): string {
  return `http://127.0.0.1:${port}/`;
}

function joinOrigin(port: number, urlPath: string): string {
  return `${urlForPort(port).slice(0, -1)}${urlPath}`;
}

// RootSummary.url is a server-authored path, never a full URL: only the origin
// is the client's to supply.
export function urlForRootPath(port: number, path: string): string {
  return joinOrigin(port, path);
}

function apiUrl(port: number, apiPath: string): string {
  return joinOrigin(port, apiPath);
}

// A hung local server must not freeze the Raycast command forever: every
// fetch in this file goes through here so it always gives up after
// timeoutMs, aborting the in-flight request rather than leaking it.
export async function fetchWithTimeout(
  fetchImpl: FetchFn,
  url: string,
  options: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Awaited<ReturnType<FetchFn>>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function resolveDeps(deps: Deps = {}): ResolvedDeps {
  return {
    fetchImpl: deps.fetchImpl ?? fetch,
    spawnImpl: deps.spawnImpl ?? crossSpawn,
    readFile: deps.readFile ?? ((p: string) => fsp.readFile(p, "utf8")),
    writeFile:
      deps.writeFile ??
      ((p: string, contents: string) => fsp.writeFile(p, contents, "utf8")),
    readDir: deps.readDir ?? ((p: string) => fsp.readdir(p)),
    platform: deps.platform ?? process.platform,
    homedir: deps.homedir ?? os.homedir,
    env: deps.env ?? process.env,
    sleepImpl:
      deps.sleepImpl ?? ((ms: number) => new Promise((r) => setTimeout(r, ms))),
    pickPort: deps.pickPort ?? defaultPickPort,
    pickPortTimeoutMs: deps.pickPortTimeoutMs ?? PICK_PORT_TIMEOUT_MS,
    existsSync: deps.existsSync ?? nodeExistsSync,
  };
}

export function isDarwin(platform: NodeJS.Platform): boolean {
  return platform === "darwin";
}

export function isWindows(platform: NodeJS.Platform): boolean {
  return platform === "win32";
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Mirrors server/settings.js:settingsDir exactly (env override included) so
// the extension reads the same directory showmd itself writes to. Kept in
// lockstep by test/datadir-guard.test.mjs, which compares both
// implementations across a platform and env matrix.
export function platformDataDir(deps: Deps = {}): string {
  const { platform, homedir, env } = resolveDeps(deps);
  if (env.SHOWMD_SETTINGS_HOME) return env.SHOWMD_SETTINGS_HOME;
  const home = homedir();
  if (isDarwin(platform))
    return path.join(home, "Library", "Application Support", "showmd");
  if (isWindows(platform))
    return path.join(
      env.LOCALAPPDATA || path.join(home, "AppData", "Local"),
      "showmd",
    );
  return path.join(
    env.XDG_DATA_HOME || path.join(home, ".local", "share"),
    "showmd",
  );
}

// Windows filesystems are case-insensitive, so the home-prefix match must be
// too, or C:\users\... entries written by other tools would escape tildifying.
export function tildify(target: string, deps: Deps = {}): string {
  const { platform, homedir } = resolveDeps(deps);
  const home = homedir();
  const sep = isWindows(platform) ? "\\" : "/";
  const fold = (p: string) => (isWindows(platform) ? p.toLowerCase() : p);
  if (fold(target) === fold(home)) return "~";
  if (fold(target).startsWith(fold(home + sep)))
    return "~" + target.slice(home.length);
  return target;
}

function parsePort(value: unknown): number | null {
  const n =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : NaN;
  return Number.isInteger(n) && n >= 1024 && n <= 65535 ? n : null;
}

async function readJSON(
  readFile: ReadFileFn,
  filePath: string,
): Promise<unknown> {
  try {
    return JSON.parse(await readFile(filePath));
  } catch {
    return null;
  }
}

export interface ServerStatus {
  running: boolean;
  port: number;
  version?: string;
  launcher?: boolean;
}

// server/protocol.js's PROTOCOL_VERSION. Bump this alongside that constant
// when the wire contract changes; a server reporting a different number must
// never be reused, per the forced-update contract (no mixed-version compat).
export const CLIENT_PROTOCOL_VERSION = 1;

export type ServerMode = "shared" | "dedicated";

export interface RootSummary {
  key: string;
  dir: string;
  name: string;
  url: string;
}

export interface ServerInfo {
  port: number;
  pid?: number;
  version?: string;
  protocol: number;
  mode: ServerMode;
  roots: RootSummary[];
}

interface ProbeHit {
  version?: string;
  protocol: number;
  mode: ServerMode;
  roots: RootSummary[];
}

// One entry of GET /api/registry, server/protocol.js's orderRegistry
// output: already filtered to protocol-matching, mode: "shared" servers and
// ordered so index 0 is the one to reuse. Never re-sorted or re-filtered
// here — that would be the exact defect this endpoint exists to remove.
export interface RegistryEntry {
  version?: string;
  launcher?: boolean;
  protocol: number;
  instanceId: string;
  startedAt: string;
  actualPort: number;
  mode: ServerMode;
  capabilities: string[];
}

async function fetchRoots(
  fetchImpl: FetchFn,
  port: number,
): Promise<RootSummary[]> {
  try {
    const res = await fetchWithTimeout(
      fetchImpl,
      apiUrl(port, "/api/roots"),
      {},
      PROBE_TIMEOUT_MS,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { roots?: RootSummary[] };
    return Array.isArray(data.roots) ? data.roots : [];
  } catch {
    return [];
  }
}

async function probe(
  fetchImpl: FetchFn,
  port: number,
): Promise<ProbeHit | null> {
  try {
    const res = await fetchWithTimeout(
      fetchImpl,
      apiUrl(port, "/api/version"),
      {},
      PROBE_TIMEOUT_MS,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      version?: string;
      protocol?: number;
      mode?: string;
    };
    if (data.mode !== "shared" && data.mode !== "dedicated") return null;
    if (typeof data.protocol !== "number") return null;
    return {
      version: data.version,
      protocol: data.protocol,
      mode: data.mode,
      roots: await fetchRoots(fetchImpl, port),
    };
  } catch {
    return null;
  }
}

// GET /api/registry on a reachable server: the canonical, already-ordered
// selection (server/protocol.js's orderRegistry). A consumer takes index 0
// and never re-derives the ordering itself.
async function fetchRegistry(
  fetchImpl: FetchFn,
  port: number,
  configuredPort?: number,
): Promise<RegistryEntry[]> {
  try {
    const qs = configuredPort ? `?configuredPort=${configuredPort}` : "";
    const res = await fetchWithTimeout(
      fetchImpl,
      apiUrl(port, `/api/registry${qs}`),
      {},
      PROBE_TIMEOUT_MS,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as RegistryEntry[]) : [];
  } catch {
    return [];
  }
}

interface PortCandidate {
  port: number;
  pid?: number;
}

async function registryCandidates(
  readFile: ReadFileFn,
  readDir: ReadDirFn,
  registryDir: string,
): Promise<PortCandidate[]> {
  let names: string[];
  try {
    names = await readDir(registryDir);
  } catch {
    return [];
  }
  const out: PortCandidate[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const entry = (await readJSON(readFile, path.join(registryDir, name))) as {
      port?: unknown;
      pid?: unknown;
    } | null;
    const port = entry ? parsePort(entry.port) : null;
    if (port) {
      out.push({
        port,
        pid: typeof entry?.pid === "number" ? entry.pid : undefined,
      });
    }
  }
  return out;
}

function hitToInfo(candidate: PortCandidate, hit: ProbeHit): ServerInfo {
  return {
    port: candidate.port,
    pid: candidate.pid,
    version: hit.version,
    protocol: hit.protocol,
    mode: hit.mode,
    roots: hit.roots,
  };
}

// Discovery order: the extension's own `port` preference and every live
// entry in server/ports.js's registry (ports/<pid>.json), probed together —
// trust is earned by a live /api/version answer, not by a file existing. The
// server is the registry's only writer; this side only reads and never
// deletes a stale entry (a dead pid's file is the server's own sweep to
// clean up, next time one boots). settings.json is deliberately excluded:
// it holds the configured port, not the bound one. Falls back to a single
// probe of the hardcoded default only when that combined batch comes back
// with nothing live.
export async function listServers(
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<ServerInfo[]> {
  const resolved = resolveDeps(deps);
  const dir = platformDataDir(deps);
  const registryDir = path.join(dir, "ports");

  const candidates: PortCandidate[] = [];
  const prefPort = parsePort(prefs.port);
  if (prefPort) candidates.push({ port: prefPort });
  candidates.push(
    ...(await registryCandidates(
      resolved.readFile,
      resolved.readDir,
      registryDir,
    )),
  );

  const seen = new Set<number>();
  const deduped = candidates.filter((c) => {
    if (seen.has(c.port)) return false;
    seen.add(c.port);
    return true;
  });

  const probed = await Promise.all(
    deduped.map(async (c) => {
      const hit = await probe(resolved.fetchImpl, c.port);
      return hit ? hitToInfo(c, hit) : null;
    }),
  );
  const live = probed.filter((s): s is ServerInfo => s !== null);
  if (live.length > 0) return live;

  const defaultHit = await probe(resolved.fetchImpl, DEFAULT_PORT);
  if (defaultHit) return [hitToInfo({ port: DEFAULT_PORT }, defaultHit)];

  return [];
}

// Single-target convenience for callers that only care about one server
// (recents, settings): the first live one listServers() finds.
export async function findServer(
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<ServerStatus> {
  const servers = await listServers(prefs, deps);
  if (servers.length > 0) {
    const s = servers[0];
    return {
      running: true,
      port: s.port,
      version: s.version,
      launcher: s.roots.length === 0,
    };
  }
  const fallbackPort = parsePort(prefs.port) ?? DEFAULT_PORT;
  return { running: false, port: fallbackPort };
}

// POST /api/roots registers target as a new root (or joins an existing
// ancestor/descendant one) on a live server and hands back the route to
// navigate to — the server is the authority on that URL, so it is used
// verbatim rather than reconstructed client-side.
async function addRoot(
  fetchImpl: FetchFn,
  port: number,
  target: string,
): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(fetchImpl, apiUrl(port, "/api/roots"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: target }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return typeof data.url === "string" ? data.url : null;
  } catch {
    return null;
  }
}

async function addTargetUrl(
  target: string,
  port: number,
  deps: Deps = {},
): Promise<string | null> {
  const route = await addRoot(resolveDeps(deps).fetchImpl, port, target);
  return route ? apiUrl(port, route) : null;
}

export interface BinaryCandidate {
  command: string;
  args: string[];
}

// Node install dirs and standard system install locations a PATH rebuild
// should try. Raycast's launched process does not inherit the user's shell
// PATH, so this list stands in for it: standard locations first (where a
// Homebrew or system package manager install actually lands the binary),
// then the node version manager dirs (nvm, fnm) this ladder already covered.
function candidatePathDirs(
  homedir: string,
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
): string[] {
  const dirs: string[] = [];
  if (isDarwin(platform)) dirs.push("/opt/homebrew/bin");
  if (!isWindows(platform)) {
    dirs.push("/usr/local/bin");
    dirs.push("/usr/bin");
    dirs.push(path.join(homedir, ".local", "bin"));
  }
  const nvmDir = env.NVM_DIR || path.join(homedir, ".nvm");
  dirs.push(path.join(nvmDir, "current", "bin"));
  dirs.push(path.join(homedir, ".fnm"));
  dirs.push(path.join(homedir, ".local", "share", "fnm"));
  if (env.npm_config_prefix) {
    dirs.push(
      isWindows(platform)
        ? env.npm_config_prefix
        : path.join(env.npm_config_prefix, "bin"),
    );
  }
  if (isWindows(platform)) {
    dirs.push(path.join(env.APPDATA || "", "npm"));
  }
  return dirs;
}

// True when a spawn error looks like "binary not found": Node's real spawn
// ENOENT message is "spawn <command> ENOENT" on every platform (not the
// shell-only "command not found" / Windows "is not recognized" text below,
// which only fires when shell:true is set, and this ladder never sets it).
// Checking for ENOENT is what makes the ladder actually fall through past a
// missing rung instead of stopping on the first one that does not exist.
export function isCommandNotFound(message: string): boolean {
  return (
    /ENOENT/i.test(message) ||
    /command not found/i.test(message) ||
    /is not recognized as an internal or external command/i.test(message)
  );
}

export function resolveBinary(
  prefs: ShowmdPrefs,
  deps: Deps = {},
): BinaryCandidate[] {
  const resolved = resolveDeps(deps);
  const windows = isWindows(resolved.platform);
  const candidates: BinaryCandidate[] = [];

  if (prefs.showmdPath && prefs.showmdPath.trim()) {
    candidates.push({
      command: prefs.showmdPath.trim(),
      args: [],
    });
  }

  const dirs = candidatePathDirs(
    resolved.homedir(),
    resolved.platform,
    resolved.env,
  );

  for (const dir of dirs) {
    const bin = windows
      ? path.join(dir, "showmd.cmd")
      : path.join(dir, "showmd");
    candidates.push({ command: bin, args: [] });
  }

  candidates.push({ command: "showmd", args: [] });

  // npx rung: never npx-always (showmd stays resident as a server, unlike
  // one-shot CLIs), so this only fires once every showmd candidate failed.
  // npx lives in the same install dirs as showmd (Homebrew, nvm, fnm), so it
  // reuses the same rebuilt dir list rather than trusting process.env.PATH,
  // which is exactly what is missing under Raycast.
  for (const dir of dirs) {
    const npxBin = windows ? path.join(dir, "npx.cmd") : path.join(dir, "npx");
    candidates.push({ command: npxBin, args: ["-y", "showmd-cli"] });
  }

  candidates.push({ command: "npx", args: ["-y", "showmd-cli"] });

  return candidates;
}

export interface SpawnResult {
  ok: boolean;
  command?: string;
  error?: string;
  port?: number;
}

// Walks resolveBinary()'s ladder, spawning detached and treating an
// immediate ENOENT-shaped error as "try the next rung" rather than failure.
//
// A cold spawn always asks the OS for a free port first and passes it as
// --port, rather than letting the CLI choose one itself: a caller waiting on
// the ports/ registry has no way to learn which port an unattended fallback
// bound to and polls a dead port forever. Knowing the port before the
// process exists removes that discovery step entirely.
async function spawnShowmdArgs(
  extraArgs: string[],
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<SpawnResult> {
  const resolved = resolveDeps(deps);
  const ladder = resolveBinary(prefs, deps);

  const controller = new AbortController();
  const pickTimeout = setTimeout(
    () => controller.abort(),
    resolved.pickPortTimeoutMs,
  );
  let port: number;
  try {
    port = await Promise.race([
      resolved.pickPort(controller.signal),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener(
          "abort",
          () => reject(new Error("timed out while choosing a free port")),
          { once: true },
        );
      }),
    ]);
  } catch (err) {
    return {
      ok: false,
      error: errorMessage(err),
    };
  } finally {
    clearTimeout(pickTimeout);
  }
  // --port goes right after extraArgs[0] rather than at the front: bin/cli.js
  // dispatches subcommands ('skills', etc.) off argv[2] alone, so a leading
  // --port would push the subcommand out of position and be misread as a
  // document path (see the "skills" mode bug this fixes).
  const args =
    extraArgs.length > 0
      ? [extraArgs[0], "--port", String(port), ...extraArgs.slice(1)]
      : ["--port", String(port)];

  const dirs = candidatePathDirs(
    resolved.homedir(),
    resolved.platform,
    resolved.env,
  );
  // Rebuilt dirs go first so a Homebrew/nvm/fnm node wins over whatever
  // bare PATH Raycast handed the child — see candidatePathDirs above.
  const spawnPath = resolved.env.PATH
    ? dirs.join(path.delimiter) + path.delimiter + resolved.env.PATH
    : dirs.join(path.delimiter);
  const spawnEnv = { ...resolved.env, PATH: spawnPath };

  for (const candidate of ladder) {
    const fullArgs = [...candidate.args, ...args];
    const result = await trySpawn(
      resolved.spawnImpl,
      candidate.command,
      fullArgs,
      spawnEnv,
      resolved.sleepImpl,
    );
    if (result.ok) return { ok: true, command: candidate.command, port };
    if (!isCommandNotFound(result.error || "")) return result;
  }
  return {
    ok: false,
    error: `showmd binary not found. Searched ${dirs.join(", ")}, PATH, and npx. Set the "ShowMD Path" preference to point at your showmd install.`,
  };
}

export function spawnShowmd(
  target: string,
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<SpawnResult> {
  return spawnShowmdArgs([target, "--no-open"], prefs, deps);
}

// bin/cli.js's rootless launcher mode (--launcher): the same boot every
// installed showmd app uses, so "start with no specific file" reuses it
// instead of pointing the CLI at an arbitrary directory.
export function spawnShowmdLauncher(
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<SpawnResult> {
  return spawnShowmdArgs(["--launcher", "--no-open"], prefs, deps);
}

// `showmd skills` per skills/showmd/SKILL.md: multi-root browse mode.
export function spawnShowmdSkills(
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<SpawnResult> {
  return spawnShowmdArgs(["skills", "--no-open"], prefs, deps);
}

// 'spawn' alone only means exec succeeded, not that the process stayed up —
// a broken shebang exits moments later. So ok:true is earned by surviving
// SPAWN_GRACE_MS past 'spawn' with no 'exit'; an exit inside that window is
// reported as a startup failure (with the stderr tail) instead of silently
// looking healthy. The 'error' path (ENOENT) is unaffected: it still lets
// the caller's ladder fall through to the next rung.
function trySpawn(
  spawnImpl: SpawnFn,
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  sleepImpl: SleepFn,
): Promise<SpawnResult> {
  return new Promise((resolve) => {
    let settled = false;
    let stderr = "";
    const settle = (result: SpawnResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    try {
      const child = spawnImpl(command, args, {
        detached: true,
        stdio: ["ignore", "ignore", "pipe"],
        windowsHide: true,
        env,
      });
      child.stderr?.on("data", (chunk: Buffer | string) => {
        stderr = (stderr + chunk.toString()).slice(-STDERR_TAIL_CHARS);
      });
      child.once("error", (err: NodeJS.ErrnoException) => {
        settle({ ok: false, error: err.message || String(err) });
      });
      child.once("spawn", () => {
        child.once(
          "exit",
          (code: number | null, signal: NodeJS.Signals | null) => {
            const cause = signal ? `signal ${signal}` : `code ${code}`;
            settle({
              ok: false,
              error: `exited with ${cause} during startup: ${stderr.trim()}`,
            });
          },
        );
        sleepImpl(SPAWN_GRACE_MS).then(() => {
          if (settled) return;
          settled = true;
          child.stderr?.destroy();
          child.unref();
          resolve({ ok: true, command });
        });
      });
    } catch (err) {
      resolve({
        ok: false,
        error: errorMessage(err),
      });
    }
  });
}

export type OpenPlan =
  | { action: "url"; url: string }
  | { action: "spawn"; result: SpawnResult; url?: string };

// The one decision every command shares: reuse a live shared server via
// add-root, or spawn the CLI. Selection is never decided here — reaching any
// live server and asking its GET /api/registry (server/protocol.js's
// orderRegistry, already filtered to protocol-matching, mode: "shared"
// entries) is the only source of which port to reuse.
export async function openTarget(
  target: string,
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<OpenPlan> {
  const resolved = resolveDeps(deps);
  const reuse = prefs.reuseServer !== false;

  if (reuse) {
    const servers = await listServers(prefs, deps);
    if (servers.length > 0) {
      const configuredPort = parsePort(prefs.port);
      const registry = await fetchRegistry(
        resolved.fetchImpl,
        servers[0].port,
        configuredPort ?? undefined,
      );
      const reusable = registry[0];
      if (reusable) {
        const url = await addTargetUrl(target, reusable.actualPort, deps);
        if (url)
          return {
            action: "url",
            url,
          };
      }
    }
  }

  const result = await spawnShowmdLauncher(prefs, deps);
  return { action: "spawn", result };
}

// Skills browsing follows the same reuse preference as every document-opening
// command. Keep the decision in this plain-node module so it is regression-
// tested without importing Raycast's UI runtime.
export async function openSkillsTarget(
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<OpenPlan> {
  if (prefs.reuseServer !== false) {
    const servers = await listServers(prefs, deps);
    const reusable = servers.find(
      (server) => server.protocol === CLIENT_PROTOCOL_VERSION,
    );
    if (reusable) {
      return {
        action: "url",
        url: `${urlForPort(reusable.port)}skills/`,
      };
    }
  }

  return { action: "spawn", result: await spawnShowmdSkills(prefs, deps) };
}

export interface RecentEntry {
  path: string;
  ts: number;
  kind?: string;
}

// Shared by readRecents/removeRecent: try the live server first, and only
// fall back to recents.json when nothing is running or the request fails.
async function withLiveServerFallback<T>(
  prefs: ShowmdPrefs,
  deps: Deps,
  liveAttempt: (port: number) => Promise<T | undefined>,
  fileFallback: () => Promise<T>,
): Promise<T> {
  const server = await findServer(prefs, deps);
  if (server.running) {
    const result = await liveAttempt(server.port);
    if (result !== undefined) return result;
  }
  return fileFallback();
}

// Prefers the live server's stat-checked, pruned list; falls back to
// reading recents.json directly (max 10, {path,ts} shape) when nothing is
// running.
export async function readRecents(
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<RecentEntry[]> {
  const resolved = resolveDeps(deps);
  return withLiveServerFallback(
    prefs,
    deps,
    async (port) => {
      try {
        const res = await fetchWithTimeout(
          resolved.fetchImpl,
          apiUrl(port, "/api/recents"),
        );
        if (!res.ok) return undefined;
        const data = (await res.json()) as { recents?: RecentEntry[] };
        return Array.isArray(data.recents) ? data.recents : undefined;
      } catch {
        return undefined;
      }
    },
    async () => {
      const dir = platformDataDir(deps);
      const parsed = await readJSON(
        resolved.readFile,
        path.join(dir, "recents.json"),
      );
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (e): e is RecentEntry =>
          !!e &&
          typeof e === "object" &&
          typeof (e as RecentEntry).path === "string" &&
          typeof (e as RecentEntry).ts === "number",
      );
    },
  );
}

export async function removeRecent(
  entryPath: string,
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<boolean> {
  const resolved = resolveDeps(deps);
  return withLiveServerFallback(
    prefs,
    deps,
    async (port) => {
      try {
        const res = await fetchWithTimeout(
          resolved.fetchImpl,
          apiUrl(port, "/api/recents/delete"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: entryPath }),
          },
        );
        return res.ok ? true : undefined;
      } catch {
        return undefined;
      }
    },
    async () => {
      const dir = platformDataDir(deps);
      const file = path.join(dir, "recents.json");
      const parsed = await readJSON(resolved.readFile, file);
      const list = Array.isArray(parsed) ? (parsed as RecentEntry[]) : [];
      const next = list.filter((e) => e.path !== entryPath);
      try {
        await resolved.writeFile(file, JSON.stringify(next, null, 2));
        return true;
      } catch {
        return false;
      }
    },
  );
}

export interface WaitForServerOptions {
  deps?: Deps;
  timeoutMs?: number;
  want?: "running" | "stopped";
}

// Polls findServer() until it reports the wanted state or timeoutMs elapses.
// Re-reads the ports/ registry on every poll (findServer -> listServers ->
// readDir/readFile deps), since a spawned server only announces itself
// after it comes up.
export async function waitForServer(
  prefs: ShowmdPrefs,
  options: WaitForServerOptions = {},
): Promise<ServerStatus> {
  const { deps = {}, timeoutMs = 10000, want = "running" } = options;
  const resolved = resolveDeps(deps);
  const pollMs = 500;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const status = await findServer(prefs, deps);
    if (want === "running" ? status.running : !status.running) return status;
    if (Date.now() >= deadline) return status;
    await resolved.sleepImpl(pollMs);
  }
}

export async function targetUrlAfterSpawn(
  target: string,
  prefs: ShowmdPrefs,
  result: SpawnResult,
  deps: Deps = {},
  timeoutMs = 10000,
): Promise<{ running: boolean; url?: string }> {
  const waitPrefs = result.port
    ? { ...prefs, port: String(result.port) }
    : prefs;
  const status = await waitForServer(waitPrefs, { deps, timeoutMs });
  if (!status.running) return { running: false };
  const url = await addTargetUrl(target, status.port, deps);
  return url ? { running: true, url } : { running: true };
}

// getManageStatus/menu bar want the full picture: every live instance, not
// just one. label() turns a single instance's roots summary into the words
// Manage Server and the Menu Bar dropdown show for it.
export function labelForServer(server: ServerInfo): string {
  if (server.roots.length === 0) return "Home";
  if (server.roots.length === 1) return `Showing ${server.roots[0].name}`;
  return `Showing ${server.roots.length} folders`;
}

// The shared server (started with `--new` never used) is the "Main" one
// Manage Server and the Menu Bar both call out among several running.
export function isMainServer(server: ServerInfo): boolean {
  return server.mode === "shared";
}

// Manage Server and the Menu Bar both list the shared server first.
export function orderedServersByMode(servers: ServerInfo[]): ServerInfo[] {
  return [...servers].sort((a, b) =>
    isMainServer(a) === isMainServer(b) ? 0 : isMainServer(a) ? -1 : 1,
  );
}

export interface ManageStatus {
  running: boolean;
  servers: ServerInfo[];
}

export async function getManageStatus(
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<ManageStatus> {
  const servers = await listServers(prefs, deps);
  return { running: servers.length > 0, servers };
}

// Shared by Manage Server and Menu Bar: same status, same words.
export function describeStatus(status: ManageStatus): string {
  if (!status.running) return "Not running";
  if (status.servers.length === 1) return labelForServer(status.servers[0]);
  return `Running (${status.servers.length})`;
}

export interface MenuBarState {
  running: boolean;
  title: string;
  subtitle: string;
  version?: string;
  count: number;
}

export function describeMenuBar(status: ManageStatus): MenuBarState {
  const count = status.servers.length;
  return {
    running: status.running,
    title: status.running
      ? count > 1
        ? `ShowMD (${count})`
        : "ShowMD"
      : "ShowMD (stopped)",
    subtitle: describeStatus(status),
    version: status.servers[0]?.version,
    count,
  };
}

async function postServerAction(
  fetchImpl: FetchFn,
  port: number,
  action: "restart" | "shutdown",
): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(
      fetchImpl,
      apiUrl(port, `/api/${action}`),
      {
        method: "POST",
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function restartServer(
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<boolean> {
  const resolved = resolveDeps(deps);
  const server = await findServer(prefs, deps);
  if (!server.running) return false;
  return postServerAction(resolved.fetchImpl, server.port, "restart");
}

export async function stopServer(
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<boolean> {
  const resolved = resolveDeps(deps);
  const server = await findServer(prefs, deps);
  if (!server.running) return false;
  return postServerAction(resolved.fetchImpl, server.port, "shutdown");
}

// Per-instance stop/restart, for the Menu Bar dropdown and Manage Server
// list where each row is its own server, not "the" server.
export async function stopServerAt(
  port: number,
  deps: Deps = {},
): Promise<boolean> {
  return postServerAction(resolveDeps(deps).fetchImpl, port, "shutdown");
}

export async function restartServerAt(
  port: number,
  deps: Deps = {},
): Promise<boolean> {
  return postServerAction(resolveDeps(deps).fetchImpl, port, "restart");
}

export async function stopAllServers(
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<boolean> {
  const servers = await listServers(prefs, deps);
  if (servers.length === 0) return true;
  const results = await Promise.all(
    servers.map((s) => stopServerAt(s.port, deps)),
  );
  return results.every(Boolean);
}

export const FONT_PRESETS = ["default", "serif", "mono"] as const;

export const MAC_BROWSER_CANDIDATES = [
  "Safari",
  "Safari Technology Preview",
  "Google Chrome",
  "Google Chrome Beta",
  "Google Chrome Canary",
  "Chromium",
  "Arc",
  "Dia",
  "Firefox",
  "Firefox Developer Edition",
  "Firefox Nightly",
  "Microsoft Edge",
  "Microsoft Edge Beta",
  "Microsoft Edge Canary",
  "Brave Browser",
  "Brave Browser Beta",
  "Brave Browser Nightly",
  "Opera",
  "Opera GX",
  "Vivaldi",
  "Orion",
  "Zen",
  "Click",
  "Tor Browser",
  "DuckDuckGo",
  "Min",
  "Waterfox",
  "LibreWolf",
  "Sidekick",
  "Yandex",
];

export function detectInstalledBrowsers(deps: Deps = {}): string[] {
  const resolved = resolveDeps(deps);
  if (!isDarwin(resolved.platform)) return [];
  const dirs = ["/Applications", path.join(resolved.homedir(), "Applications")];
  return MAC_BROWSER_CANDIDATES.filter((name) =>
    dirs.some((dir) => resolved.existsSync(path.join(dir, `${name}.app`))),
  );
}

// 'default' first, then whatever was detected; the currently saved value is
// appended if detection missed it, so opening the form never silently
// changes a working setting to one the dropdown doesn't otherwise offer.
export function browserOptions(detected: string[], current: string): string[] {
  const options = ["default", ...detected];
  if (current && !options.includes(current)) options.push(current);
  return options;
}

export interface ShowmdSettings {
  colorMode: string;
  openMode: string;
  fontPreset: string;
  fontSize: number;
  browser: string;
  port: number;
  updateCheck: boolean;
}

export async function getSettings(
  prefs: ShowmdPrefs,
  deps: Deps = {},
): Promise<ShowmdSettings | null> {
  const resolved = resolveDeps(deps);
  const server = await findServer(prefs, deps);
  if (!server.running) return null;
  try {
    const res = await fetchWithTimeout(
      resolved.fetchImpl,
      apiUrl(server.port, "/api/settings"),
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<ShowmdSettings>;
    return {
      colorMode: typeof data.colorMode === "string" ? data.colorMode : "system",
      openMode: typeof data.openMode === "string" ? data.openMode : "read",
      fontPreset:
        typeof data.fontPreset === "string" ? data.fontPreset : "default",
      fontSize: typeof data.fontSize === "number" ? data.fontSize : 15.5,
      browser: typeof data.browser === "string" ? data.browser : "default",
      port: typeof data.port === "number" ? data.port : server.port,
      updateCheck:
        typeof data.updateCheck === "boolean" ? data.updateCheck : true,
    };
  } catch {
    return null;
  }
}

export async function putSettings(
  prefs: ShowmdPrefs,
  changes: Partial<ShowmdSettings>,
  deps: Deps = {},
): Promise<boolean> {
  const resolved = resolveDeps(deps);
  const server = await findServer(prefs, deps);
  if (!server.running) return false;
  try {
    const res = await fetchWithTimeout(
      resolved.fetchImpl,
      apiUrl(server.port, "/api/settings"),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

// Pure: only the keys that actually changed, for a minimal PUT payload.
export function diffSettings(
  original: ShowmdSettings,
  current: ShowmdSettings,
): Partial<ShowmdSettings> {
  const changes: Partial<ShowmdSettings> = {};
  for (const key of Object.keys(original) as (keyof ShowmdSettings)[]) {
    if (original[key] !== current[key]) {
      (changes as Record<string, unknown>)[key] = current[key];
    }
  }
  return changes;
}

export interface SelectedItem {
  path: string;
  isDirectory: boolean;
}

// Only the first valid (markdown file or directory) item is ever opened.
// "skipped" counts every other selected item, valid or not, since only one
// target can be opened at a time: that keeps the toast's count honest
// whether the rest were non-markdown files or just extra valid picks.
export function pickSelectionTarget(items: SelectedItem[]): {
  target: string | null;
  skipped: number;
} {
  const valid = items.find(
    (item) => item.isDirectory || /\.md$/i.test(item.path),
  );
  if (!valid) return { target: null, skipped: 0 };
  return { target: valid.path, skipped: items.length - 1 };
}
