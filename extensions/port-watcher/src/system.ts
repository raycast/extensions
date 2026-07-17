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
  // When the process was born, verbatim from ps ("Thu Jul 17 11:14:27 2026").
  // An opaque token, never parsed: two readings either match or they do not.
  // This is the missing half of a process identity — a PID names a slot the
  // kernel reuses the moment its holder exits, and (pid, start time) is what
  // pins THE process. Signals are the one place that distinction is fatal;
  // see killListener.
  started?: string;
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

// Every ps read in this file asks for "pid=,<field>=" and gets back lines of
// "<pid> <rest of line>". One tiny parser for all of them, exported for tests.
// The rest is taken whole and trimmed, never split: a command line and a start
// time both contain spaces of their own.
export function parsePidRest(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of raw.split("\n")) {
    const m = line.trim().match(/^(\d+)\s+(.*)$/);
    if (m) map.set(m[1], m[2].trim());
  }
  return map;
}

// ps exits with code 1 when ANY of the asked pids no longer exists — while
// still printing the ones that do. Same shape as lsof's "nothing found" exit:
// the non-zero code is an answer, not a failure, and promisify hides the
// output inside the error. So we salvage err.stdout and parse it; a pid that
// is genuinely gone is simply absent from the map, which is exactly what the
// callers need to know. Only a real exec failure (no stdout at all) throws.
//
// Before this salvage, one pid dying between the lsof read and the ps call
// made the whole batch return empty — every row silently lost its details
// because one process exited at the wrong moment.
async function runPs(pids: string[], field: "command" | "lstart"): Promise<Map<string, string>> {
  if (pids.length === 0) return new Map();
  try {
    const { stdout } = await execFileAsync("ps", ["-p", pids.join(","), "-o", `pid=,${field}=`]);
    return parsePidRest(stdout);
  } catch (err) {
    const stdout = (err as { stdout?: string }).stdout;
    if (typeof stdout === "string") return parsePidRest(stdout);
    throw err;
  }
}

// A single ps call for EVERY pid (ps accepts "-p 1,2,3") instead of one call per
// process: the cost of enrichment stays constant no matter how many servers run.
// Output looks like: "  620 /usr/libexec/rapportd"
async function fetchCommands(pids: string[]): Promise<Map<string, string>> {
  try {
    return await runPs(pids, "command");
  } catch {
    // Enrichment is a bonus: on failure we return an empty map and the list
    // still renders, just without the details.
    return new Map();
  }
}

// Start times, batched like the command lines but in a SEPARATE ps call: both
// fields contain arbitrary spaces, so "rest of line" can only stay unambiguous
// if each call carries one such field.
//
// Unlike the other enrichments this one THROWS on a real exec failure instead
// of returning an empty map. readListeningPorts treats it as a bonus and
// catches; the kill path must not — there, "ps failed" blocks a signal while
// "process gone" (absent from the map) explains one, and collapsing the two
// would turn an outage into a lie.
export async function fetchStartTimes(pids: string[]): Promise<Map<string, string>> {
  return runPs(pids, "lstart");
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

  // The enrichments are independent, so Promise.all runs them in parallel
  // instead of doing ps THEN lsof THEN ps in series for nothing.
  const [commands, cwds, starts] = await Promise.all([
    fetchCommands(pids),
    fetchCwds(pids),
    fetchStartTimes(pids).catch(() => new Map<string, string>()),
  ]);

  return base.map((p) => {
    const cwd = cwds.get(p.pid);
    return {
      ...p,
      cwd,
      fullCommand: commands.get(p.pid),
      started: starts.get(p.pid),
      kind: classify(p.command, cwd),
    };
  });
}

// May a signal be sent? Decided from the start time captured when the user was
// looking at the row (expected) against the one read just now (observed).
// Pure, exported so the tests can pin every row of the table.
//
//   observed missing        -> "gone"        the PID is not in use at all
//   expected missing        -> "unverified"  we never saw its start time, so we
//                                            cannot claim identity — refuse
//   present but different   -> "replaced"    the PID was recycled or the server
//                                            restarted; not the confirmed process
//   present and equal       -> "proceed"
//
// The gone check comes first on purpose: a PID that is not there is gone,
// whether or not we ever knew its start time.
export function killVerdict(
  expected: string | undefined,
  observed: string | undefined,
): "proceed" | "gone" | "replaced" | "unverified" {
  if (!observed) return "gone";
  if (!expected) return "unverified";
  return observed === expected ? "proceed" : "replaced";
}

// The only path in this codebase that sends a signal — after proving the PID
// still belongs to the process the user confirmed, not to whatever holds that
// number now.
//
// A PID is a slot, not an identity: the moment its holder exits, the kernel may
// hand the number to anything. The row was read at some earlier refresh and a
// confirmation dialog can sit open for minutes, so the signal is gated on the
// one thing a recycled PID cannot keep — the process start time. A new process
// is born at a new second; colliding would take the kernel cycling the entire
// PID space back to this number within that second.
//
// The signal itself is the process.kill SYSCALL, not an execFile of kill(1):
// nothing is spawned between the verdict and the signal, so what remains of the
// race is the sub-millisecond between ps returning and the syscall firing.
// macOS offers no way to close it entirely (no pidfd; kill(2) takes a bare
// number) — an exit inside that window comes back as ESRCH and is reported as
// "gone", never signalled onward.
//
// SIGTERM asks; SIGKILL cannot be caught, which is exactly why the force path
// goes through this same gate and is never the first resort.
export async function killListener(
  target: ListeningPort,
  opts: { force?: boolean } = {},
): Promise<"signaled" | "gone" | "replaced" | "unverified"> {
  let observed: string | undefined;
  try {
    observed = (await fetchStartTimes([target.pid])).get(target.pid);
  } catch {
    return "unverified"; // ps itself failed: we know nothing, so we send nothing
  }

  const verdict = killVerdict(target.started, observed);
  if (verdict !== "proceed") return verdict;

  try {
    process.kill(Number(target.pid), opts.force ? "SIGKILL" : "SIGTERM");
  } catch (err) {
    // Exited between the read and the syscall: the same honest answer.
    if ((err as NodeJS.ErrnoException).code === "ESRCH") return "gone";
    throw err; // EPERM and the rest are real failures the caller must surface
  }
  return "signaled";
}

// Did the process actually go away? Signal 0 delivers nothing: it only asks the
// kernel "does this pid exist" — ESRCH means gone, EPERM means alive but not
// ours. Pure Node, no subprocess per poll. Bounded: SIGTERM is a request, and a
// process saving its state may honestly take a moment. Returns what it saw —
// true = gone, false = still alive when we stopped looking — and never decides
// what that means.
//
// This answers LIVENESS only, never identity: a recycled PID reads as "still
// alive". That is safe because nothing destructive follows from this answer —
// the worst it can do is offer the force-kill dialog, and the signal behind
// that dialog re-verifies identity through killListener's gate.
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
