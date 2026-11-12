import { execFile } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { open } from "node:fs/promises";
import { homedir, userInfo } from "node:os";
import { basename, dirname, join } from "node:path";
import { promisify } from "node:util";
import { type Service, type StopTargets, findBinary, shellQuote, tailLog, terminateProcesses } from "./tmux.ts";

const execFileAsync = promisify(execFile);

// Dev services that run outside the makedeck tmux server, e.g. started by a coding agent
// in the background. Detection is pure (detectExternal); scanning feeds it from ps and lsof.

export type Proc = { pid: number; ppid: number; pgid: number; args: string };
export type OpenFiles = { cwd?: string; stdout?: { type: string; name: string } };
export type ExternalService = {
  id: string; // `ext:${pid}`
  pid: number;
  pgid: number;
  project: string;
  projectPath: string;
  name: string;
  command: string;
  ports: number[];
  logPath: string | null;
  stdout: string | null; // stdout name, for the "No log" message
  makedeckReady: boolean; // the Makefile in projectPath lists at least one prerequisite of dev
};
export type DetectInput = {
  procs: Proc[];
  listeners: Map<number, number[]>;
  files: Map<number, OpenFiles>;
  panePids: Set<number>;
  sessionPaths: string[];
  home: string;
  readMakefile: (dir: string) => string | null; // file content or null
  isRepoRoot: (dir: string) => boolean; // dir contains .git
};

const NAME_MAX = 40;
// Raycast's PATH is minimal, so call both by absolute path.
const PS = "/bin/ps";
const LSOF = "/usr/sbin/lsof";
const MAX_BUFFER = 64 * 1024 * 1024;
// Only the end of a log file is shown; dev server logs can grow to gigabytes.
const LOG_BYTES = 64 * 1024;
const MOVE_TIMEOUT_MS = 30_000;
const PS_ARGS = ["-x", "-ww", "-o", "pid=,ppid=,pgid=,args="];

// Output of `ps` with PS_ARGS.
export function parsePs(out: string): Proc[] {
  return out.split("\n").flatMap((line) => {
    const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (!match) return [];
    const [, pid, ppid, pgid, args] = match;
    return [{ pid: Number(pid), ppid: Number(ppid), pgid: Number(pgid), args }];
  });
}

// Output of `lsof -iTCP -sTCP:LISTEN -Fpn`: "p<pid>" lines, then "n<address>:<port>".
export function parseListeners(out: string): Map<number, number[]> {
  const ports = new Map<number, Set<number>>();
  let current: Set<number> | undefined;
  for (const line of out.split("\n")) {
    if (line.startsWith("p")) {
      current = new Set();
      ports.set(Number(line.slice(1)), current);
    } else if (line.startsWith("n") && current) {
      const port = Number(line.slice(line.lastIndexOf(":") + 1));
      if (Number.isInteger(port) && port > 0) current.add(port);
    }
  }
  return new Map([...ports].map(([pid, set]) => [pid, [...set].sort((a, b) => a - b)]));
}

// Output of `lsof -d cwd,1 -Fpftn`: per "p<pid>", "f<fd>" then "t<type>" and "n<name>".
export function parseFiles(out: string): Map<number, OpenFiles> {
  const files = new Map<number, OpenFiles>();
  let current: OpenFiles | undefined;
  let fd = "";
  let type = "";
  for (const line of out.split("\n")) {
    const value = line.slice(1);
    switch (line[0]) {
      case "p":
        current = {};
        files.set(Number(value), current);
        fd = "";
        break;
      case "f":
        fd = value;
        type = "";
        break;
      case "t":
        type = value;
        break;
      case "n":
        if (!current) break;
        if (fd === "cwd") current.cwd = value;
        else if (fd === "1") current.stdout = { type, name: value };
        break;
    }
  }
  return files;
}

// Targets of a make command line; null if it is not make or gmake.
export function makeTargets(args: string): string[] | null {
  const words = args.trim().split(/\s+/);
  if (!/^g?make$/.test(basename(words[0] ?? ""))) return null;
  const targets: string[] = [];
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if (["-C", "-f", "-I", "-o", "-W"].includes(word)) i++;
    else if (word.startsWith("-") || /^\d+$/.test(word) || word.includes("=")) continue;
    else targets.push(word);
  }
  return targets;
}

// "dev: api worker ## comment" -> ["api", "worker"]; same rule as prereqs in bin/makedeck.
export function devPrereqs(makefile: string): string[] {
  const line = makefile.split("\n").find((l) => /^dev\s*:/.test(l));
  if (line === undefined) return [];
  return line
    .replace(/^dev\s*:/, "")
    .replace(/##.*/, "")
    .split(/\s+/)
    .filter(Boolean);
}

function childrenOf(procs: Proc[]): Map<number, number[]> {
  const children = new Map<number, number[]>();
  for (const { pid, ppid } of procs) children.set(ppid, [...(children.get(ppid) ?? []), pid]);
  return children;
}

// The given PIDs and all their descendants.
function subtree(roots: Iterable<number>, children: Map<number, number[]>): Set<number> {
  const seen = new Set<number>();
  const stack = [...roots];
  while (stack.length > 0) {
    const pid = stack.pop()!;
    if (seen.has(pid)) continue;
    seen.add(pid);
    stack.push(...(children.get(pid) ?? []));
  }
  return seen;
}

// Started by launchd and leading its own group, e.g. "adb fork-server". An orphaned child
// of a dead shell keeps the shell's group and stays visible.
const isDaemon = (proc: Proc) => proc.ppid === 1 && proc.pid === proc.pgid;

export function candidatePids(procs: Proc[], listeners: Map<number, number[]>, panePids: Set<number>): number[] {
  const inPanes = subtree(panePids, childrenOf(procs));
  return procs
    .filter((proc) => !inPanes.has(proc.pid))
    .filter((proc) => makeTargets(proc.args) !== null || (listeners.has(proc.pid) && !isDaemon(proc)))
    .map((proc) => proc.pid);
}

// dir and its parents up to /, nearest first.
function ancestorsOrSelf(dir: string): string[] {
  const dirs = [dir];
  while (dirs[dirs.length - 1] !== "/" && dirs[dirs.length - 1] !== ".") {
    dirs.push(dirname(dirs[dirs.length - 1]));
  }
  return dirs;
}

// Path-like words become their basename: "node /x/.bin/expo start" -> "node expo start".
function shortName(args: string): string {
  const name = args
    .trim()
    .split(/\s+/)
    .map((word) => (word.includes("/") ? basename(word) : word))
    .join(" ");
  return name.length <= NAME_MAX ? name : name.slice(0, NAME_MAX - 1) + "…";
}

export function detectExternal(input: DetectInput): ExternalService[] {
  const { procs, listeners, files, panePids, home, readMakefile, isRepoRoot } = input;
  const byPid = new Map(procs.map((proc) => [proc.pid, proc]));
  const children = childrenOf(procs);
  const sessionPaths = new Set(input.sessionPaths);

  const projectOf = (cwd: string, isMake: boolean): string | undefined => {
    const dirs = ancestorsOrSelf(cwd);
    const session = dirs.find((dir) => sessionPaths.has(dir));
    if (session) return session;
    if (isMake) return cwd;
    // A dotfiles repository at ~ does not make everything below it a project.
    const repo = dirs.find(isRepoRoot);
    return repo !== undefined && repo.startsWith(home + "/") ? repo : undefined;
  };

  const kept: { proc: Proc; projectPath: string; targets: string[] | null; files: OpenFiles }[] = [];
  for (const pid of candidatePids(procs, listeners, panePids)) {
    const proc = byPid.get(pid)!;
    const open = files.get(pid);
    // Missing: the process exited between ps and lsof.
    if (open?.cwd === undefined) continue;
    const targets = makeTargets(proc.args);
    const projectPath = projectOf(open.cwd, targets !== null);
    if (projectPath === undefined) continue;
    if (targets !== null) {
      const prereqs = devPrereqs(readMakefile(open.cwd) ?? "");
      const isDevTarget = targets.some((target) => target === "dev" || prereqs.includes(target));
      const listens = [...subtree([pid], children)].some((p) => listeners.has(p));
      if (!isDevTarget && !listens) continue;
    }
    kept.push({ proc, projectPath, targets, files: open });
  }

  const keptPids = new Set(kept.map(({ proc }) => proc.pid));
  const hasKeptAncestor = (proc: Proc) => {
    const seen = new Set<number>();
    for (let p = byPid.get(proc.ppid); p !== undefined && !seen.has(p.pid); p = byPid.get(p.ppid)) {
      if (keptPids.has(p.pid)) return true;
      seen.add(p.pid);
    }
    return false;
  };

  return kept
    .filter(({ proc }) => !hasKeptAncestor(proc))
    .map(({ proc, projectPath, targets, files: open }): ExternalService => {
      const ports = [...subtree([proc.pid], children)].flatMap((p) => listeners.get(p) ?? []);
      return {
        id: `ext:${proc.pid}`,
        pid: proc.pid,
        pgid: proc.pgid,
        project: basename(projectPath).replace(/[.:]/g, "_"),
        projectPath,
        name: targets === null ? shortName(proc.args) : targets.join(" ") || "make",
        command: proc.args,
        ports: [...new Set(ports)].sort((a, b) => a - b),
        logPath: open.stdout?.type === "REG" ? open.stdout.name : null,
        stdout: open.stdout?.name ?? null,
        makedeckReady: devPrereqs(readMakefile(projectPath) ?? "").length > 0,
      };
    });
}

// Log files of dev servers are written for a terminal: colors, cursor movement and "\r"
// progress bars. Keep plain text, and of each line only what is visible last.
// Matching terminal escape sequences needs control characters.
/* eslint-disable no-control-regex */
const OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g; // e.g. window titles
const CSI = /\x1b\[[0-?]*[ -/]*[@-~]/g; // colors, cursor movement
const ESC2 = /\x1b[@-Z\\-_]/g; // other two-byte escapes
/* eslint-enable no-control-regex */

export function cleanLog(raw: string): string {
  return raw
    .replace(OSC, "")
    .replace(CSI, "")
    .replace(ESC2, "")
    .split("\n")
    .map((line) => {
      const text = line.replace(/\r+$/, "");
      return text.slice(text.lastIndexOf("\r") + 1);
    })
    .join("\n");
}

async function lsof(args: string[]): Promise<string> {
  try {
    return (await execFileAsync(LSOF, args, { maxBuffer: MAX_BUFFER })).stdout;
  } catch (error) {
    // lsof exits 1 when it finds nothing, and also when one of several -p processes has
    // exited in the meantime; the output for the others is still valid.
    const { code, stdout } = error as { code?: unknown; stdout?: string };
    if (code === 1) return stdout ?? "";
    throw error;
  }
}

// lsof reports resolved paths (/private/tmp), tmux and homedir() may not.
export function realPath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

function readMakefile(dir: string): string | null {
  try {
    return readFileSync(join(dir, "Makefile"), "utf8");
  } catch {
    return null;
  }
}

export async function listExternalServices(services: Service[], home = homedir()): Promise<ExternalService[]> {
  const [ps, listening] = await Promise.all([
    execFileAsync(PS, PS_ARGS, { maxBuffer: MAX_BUFFER }),
    lsof(["-nP", "-iTCP", "-sTCP:LISTEN", "-a", "-u", String(userInfo().uid), "-Fpn"]),
  ]);
  const procs = parsePs(ps.stdout);
  const listeners = parseListeners(listening);
  const panePids = new Set(services.flatMap(({ pid }) => (pid === null ? [] : [pid])));
  const candidates = candidatePids(procs, listeners, panePids);
  const files =
    candidates.length === 0
      ? new Map<number, OpenFiles>()
      : parseFiles(await lsof(["-a", "-d", "cwd,1", "-p", candidates.join(","), "-Fpftn"]));
  return detectExternal({
    procs,
    listeners,
    files,
    panePids,
    sessionPaths: [...new Set(services.map(({ projectPath }) => realPath(projectPath)))],
    home: realPath(home),
    readMakefile,
    isRepoRoot: (dir) => existsSync(join(dir, ".git")),
  });
}

export async function readLogFile(path: string, maxLines = 200): Promise<string> {
  const file = await open(path, "r");
  try {
    const { size } = await file.stat();
    const start = Math.max(0, size - LOG_BYTES);
    const buffer = Buffer.alloc(size - start);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, start);
    let text = buffer.subarray(0, bytesRead).toString("utf8");
    // The first line is cut off (possibly inside a UTF-8 character) unless we read from 0.
    if (start > 0) text = text.slice(text.indexOf("\n") + 1);
    return tailLog(cleanLog(text), maxLines);
  } finally {
    await file.close();
  }
}

// Without job control (a coding agent's shell, `sh -c "… &"`) a server stays in its
// parent's process group, which can also hold the agent and unrelated jobs. The group is
// signaled only if the service leads it or every member descends from the service;
// otherwise only the service and its descendants are.
export function stopTargets(procs: Proc[], { pid, pgid }: { pid: number; pgid: number }): StopTargets {
  const tree = subtree([pid], childrenOf(procs));
  const running = procs.filter((proc) => tree.has(proc.pid)).map((proc) => proc.pid);
  const ownsGroup = pgid === pid || procs.every((proc) => proc.pgid !== pgid || tree.has(proc.pid));
  return { groups: ownsGroup ? [pgid] : [], pids: running };
}

// Looks at the processes again: the service may have started or lost children, or other
// jobs may have joined its group, since the last scan.
export async function stopExternal(service: ExternalService): Promise<void> {
  const ps = await execFileAsync(PS, PS_ARGS, { maxBuffer: MAX_BUFFER });
  await terminateProcesses(stopTargets(parsePs(ps.stdout), service));
}

// Stops what runs outside makedeck for this project, then starts the project in makedeck.
// makedeck runs through the user's login shell so that nvm, rbenv & co. are on PATH, as
// in a terminal. Shell startup files may change the directory, so cd again before exec;
// builtin skips cd wrappers such as zoxide.
export async function moveToMakedeck(projectPath: string, externals: ExternalService[]): Promise<void> {
  const makedeck = findBinary("makedeck");
  if (!makedeck) throw new Error("makedeck not found. Install it and put it on PATH.");
  await Promise.all(externals.filter((s) => s.projectPath === projectPath).map(stopExternal));
  const command = `builtin cd ${shellQuote(projectPath)} && exec ${shellQuote(makedeck)}`;
  const run = execFileAsync(process.env.SHELL || "/bin/zsh", ["-l", "-i", "-c", command], {
    cwd: projectPath,
    timeout: MOVE_TIMEOUT_MS,
  });
  run.child.stdin?.end();
  await run;
}
