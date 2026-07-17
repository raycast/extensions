// Everything that reads the machine: which ports are open, who owns them, and
// whether that owner is one of your projects or background noise.
// No Raycast imports here on purpose — this module is plain Node, so it can be
// exercised outside the app.

import { execFile } from "child_process";
import { promisify } from "util";

// execFile is a callback-style API (historical Node). promisify turns it into a
// Promise-returning function, which lets us await our commands one after another
// instead of nesting callbacks. We deliberately keep execFile over exec here:
// every argument is passed in an array, so no shell interprets a string. That
// matters for these commands because WE build the arguments — see launch.ts for
// the one place where the opposite choice is the right one.
export const execFileAsync = promisify(execFile);

// What we read straight out of lsof.
export interface RawPort {
  command: string; // e.g. "node", "rapportd"
  pid: string;
  port: string;
  address: string; // "127.0.0.1", or "*" for every interface
}

// "system"    = macOS background noise, hidden by default.
// "project"   = a server started from a project folder, so probably yours.
// "container" = a container runtime: your project may be behind it, but we
//               cannot see inside from the host. Never hidden.
export type Kind = "project" | "system" | "container";

// The same entry, enriched by ps (full command line) and lsof -d cwd.
export interface ListeningPort extends RawPort {
  cwd?: string; // undefined when the process won't tell us (root-owned)
  fullCommand?: string;
  kind: Kind;
}

// lsof emits no JSON, but it has a machine format: -F prints one field per
// line, each prefixed by a letter. We ask for p (pid), c (command) and n (the
// "address:port" name), and get per-process blocks:
//
//   p620                        <- new process block
//   crapportd                   <- its command name, one line, spaces intact
//   f14                         <- a file descriptor (we ignore these)
//   n*:64278                    <- one name per descriptor
//   f15
//   n*:64278                    <- IPv4/IPv6 twin of the same port
//   p633
//   cControlCenter
//   ...
//
// This replaced parsing the human-readable columns by splitting on spaces.
// That version had a hole we fell into: with +c 0 the command name keeps its
// spaces ("Claude Helper (Renderer)"), every column shifts, the port regex
// lands on the wrong field — and the listener is silently dropped from the
// list. Here the command is one whole line, so a space in it costs nothing.
export function parseLsofOutput(raw: string): RawPort[] {
  const results: RawPort[] = [];

  // One service usually listens on both IPv4 and IPv6, so lsof reports the same
  // (pid, port) twice. We only want one entry per process/port pair. The address
  // family changes neither the kill (same PID) nor the "this port is busy"
  // reading, so we drop the twin on purpose.
  const seen = new Set<string>();

  let pid = "";
  let command = "";

  for (const line of raw.split("\n")) {
    const value = line.slice(1);
    switch (line[0]) {
      case "p":
        pid = value;
        command = ""; // a new block: never carry the previous block's name
        break;
      case "c":
        command = value;
        break;
      case "n": {
        if (!pid || !command) break; // malformed block: skip rather than invent

        // Split on the LAST colon to separate address from port: an IPv6
        // address contains colons of its own, hence the greedy .+ followed by
        // the final digits.
        const match = value.match(/(.+):(\d+)$/);
        if (!match) break;

        const port = match[2];
        const dedupKey = `${pid}-${port}`;
        if (seen.has(dedupKey)) break;
        seen.add(dedupKey);

        results.push({ command, pid, address: match[1], port });
        break;
      }
      // f (descriptors) and anything else: not ours, ignore.
    }
  }

  return results;
}

// Bound to every interface means reachable from the local network, not just
// this machine — the one fact about the address column worth surfacing.
// lsof prints "*" for INADDR_ANY; the raw forms are kept for safety.
export function isExposed(address: string): boolean {
  return address === "*" || address === "0.0.0.0" || address === "::";
}

// lsof exits with code 1 when it simply finds nothing to list, which is not a
// failure for us ("no server right now"). promisify turns that exit code into an
// exception but still hands us the output on err.stdout, so we take it rather
// than blow up.
export async function runLsof(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("lsof", args);
    return stdout;
  } catch (err) {
    return (err as { stdout?: string }).stdout ?? "";
  }
}

// A single ps call for EVERY pid (ps accepts "-p 1,2,3") instead of one call per
// process: the cost of enrichment stays constant no matter how many servers run.
// Output looks like: "  620 /usr/libexec/rapportd"
async function fetchCommands(pids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (pids.length === 0) return map;

  try {
    const { stdout } = await execFileAsync("ps", ["-p", pids.join(","), "-o", "pid=,command="]);
    for (const line of stdout.split("\n")) {
      const m = line.trim().match(/^(\d+)\s+(.*)$/);
      if (m) map.set(m[1], m[2].trim());
    }
  } catch {
    // Enrichment is a bonus: on failure we return an empty map and the list
    // still renders, just without the details.
  }
  return map;
}

// The process working directory. This is THE field that identifies a dev server
// ("that's the such-and-such project") where lsof only ever says "node".
// -Fn asks for machine format: one field per line, prefixed by its letter, which
// spares us another aligned-column parse. Output:
//   p620      <- pid
//   fcwd      <- the descriptor we asked for
//   n/        <- the path
export function parseCwdOutput(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  let currentPid = "";

  for (const line of raw.split("\n")) {
    if (line.startsWith("p")) currentPid = line.slice(1);
    else if (line.startsWith("n") && currentPid) map.set(currentPid, line.slice(1));
  }
  return map;
}

async function fetchCwds(pids: string[]): Promise<Map<string, string>> {
  if (pids.length === 0) return new Map();
  // Batched like ps. If some pids died in the meantime lsof exits non-zero but
  // still returns the rest, and runLsof salvages that output.
  return parseCwdOutput(await runLsof(["-a", "-p", pids.join(","), "-d", "cwd", "-Fn"]));
}

// When a project runs inside a container, the process visible on the host is the
// runtime's proxy, not your server: its cwd can NEVER be your folder. The cwd
// rule below would file it as "system" and hide it — one of your own servers,
// gone without a word. That is the one failure we refuse.
//
// These names only ever FORCE DISPLAY: this list can un-hide, never hide. A
// wrong or missing name costs one noisy row, never a lost server. That property
// is what makes it acceptable to maintain this list blind.
//
// We do not pretend to identify WHICH project runs in the container: that would
// mean querying `docker ps` and correlating ports. Separate block, the day there
// is a Docker on this machine to test it against.
const CONTAINER_HINTS = [
  "docker", // Docker Desktop: com.docker.backend, docker-proxy, dockerd
  "orbstack",
  "colima",
  "podman",
  "lima", // limactl, the backend under colima
  "rancher",
  "vpnkit", // network relay for Docker Desktop / Rancher
  "gvproxy", // network relay for podman
  "qemu", // the VM under colima / lima
];

// Classification heuristic. System daemons are started by launchd, which hands
// them "/" as their working directory. A server YOU start inherits the folder
// you started it from, so a real project path. The cwd therefore encodes
// "did somebody launch this from a project, or did the system start it alone".
// No readable cwd means a root process we couldn't kill without sudo anyway:
// same treatment as system.
//
// Pure function (no system calls), so it is testable with fabricated inputs,
// without needing a real Docker installed.
export function classify(command: string, cwd: string | undefined): Kind {
  // Containers win over the cwd rule, which would condemn them wrongly.
  const name = command.toLowerCase();
  if (CONTAINER_HINTS.some((hint) => name.includes(hint))) return "container";

  if (!cwd || cwd === "/") return "system";
  return "project";
}

// The one entry point the UI needs: a full, enriched snapshot of what listens.
export async function readListeningPorts(): Promise<ListeningPort[]> {
  // -Fpcn is the machine format parseLsofOutput expects. "+c 0" disables
  // lsof's 9-character truncation of the command name — -F output already
  // seems untruncated, but the flag costs nothing and guards against other
  // lsof versions deciding otherwise. Truncation would break container
  // detection: "com.docke" instead of "com.docker.backend".
  const base = parseLsofOutput(await runLsof(["+c", "0", "-iTCP", "-sTCP:LISTEN", "-nP", "-Fpcn"]));
  const pids = [...new Set(base.map((p) => p.pid))];

  // Both enrichments are independent, so Promise.all runs them in parallel and
  // waits for both, instead of doing ps THEN lsof in series for nothing.
  const [commands, cwds] = await Promise.all([fetchCommands(pids), fetchCwds(pids)]);

  return base.map((p) => {
    const cwd = cwds.get(p.pid);
    return { ...p, cwd, fullCommand: commands.get(p.pid), kind: classify(p.command, cwd) };
  });
}

// Is this the same listener we saw a moment ago?
//
// A PID does not identify a process — it identifies one only while that process
// lives. Once it exits, the kernel is free to hand its number to anything else.
// So a PID read at some earlier refresh is a claim with an expiry date, and
// acting on it later means signalling a number rather than a process.
//
// The port, the command name and the folder are the rest of the identity. All
// four agreeing is as close to certainty as we can get from outside, and any one
// of them disagreeing is proof enough that this is not our process any more.
//
// Pure, so the tests can pin it down without a machine to observe.
export function sameListener(a: ListeningPort, b: ListeningPort): boolean {
  return a.pid === b.pid && a.port === b.port && a.command === b.command && a.cwd === b.cwd;
}

// SIGTERM by default: we politely ask the process to stop. Escalating to
// SIGKILL is a separate, explicit call — the UI offers it only after the
// process was seen surviving SIGTERM, and only with the user's say-so.
export async function killPid(pid: string): Promise<void> {
  await execFileAsync("kill", [pid]);
}

// SIGKILL: cannot be caught or ignored. The process gets no chance to clean up,
// which is why this is never the first resort and never automatic.
export async function killPidForce(pid: string): Promise<void> {
  await execFileAsync("kill", ["-9", pid]);
}

// Did the process actually go away? Signal 0 delivers nothing: it only asks the
// kernel "does this pid exist" — ESRCH means gone, EPERM means alive but not
// ours. Pure Node, no subprocess per poll. Bounded: SIGTERM is a request, and a
// process saving its state may honestly take a moment. Returns what it saw —
// true = gone, false = still alive when we stopped looking — and never decides
// what that means.
export async function waitForExit(pid: string, timeoutMs = 2500): Promise<boolean> {
  const target = Number(pid);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      process.kill(target, 0);
    } catch {
      return true; // ESRCH: no such process — it exited
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}
