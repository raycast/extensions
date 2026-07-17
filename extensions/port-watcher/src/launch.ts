// Starting a declared profile, and telling you the truth about whether it worked.

import { spawn } from "child_process";
import { closeSync, openSync, writeSync } from "fs";
import { appendFile, mkdir, readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { PROFILES_DIR, type Profile } from "./profiles";
import { LAUNCH_MARK, readListeningPorts, type ListeningPort } from "./system";

// One log per profile. The alternative — stdio: "ignore" — throws the output
// away, so a command that dies on startup does so in total silence: you click
// Launch, nothing happens, and there is nothing left to look at. That is exactly
// the silent failure this project refuses everywhere else. Proven useful on day
// one: the log is what explains "Port 5173 is in use, trying another one…".
export const LOGS_DIR = join(PROFILES_DIR, "logs");

export function logFileFor(profileId: string): string {
  return join(LOGS_DIR, `${profileId}.log`);
}

// Runs are appended, never overwritten: the log you most want to reread is the
// previous run's, right after a retry wiped the screen. Each run opens with
// this separator so the file stays legible — and so tailLog can hand back the
// LAST run only, instead of blaming a silent failure on the previous run's
// output.
const RUN_SEPARATOR_PREFIX = "===== run ";

function runSeparator(run: string): string {
  return `\n${RUN_SEPARATOR_PREFIX}${new Date().toISOString()} — ${run}\n`;
}

// Appending forever would grow without bound, so past this size the next launch
// starts the file over. One old log is history; ten megabytes of them is noise.
const LOG_RESET_BYTES = 1_000_000;

// Which profiles have ever been launched — i.e. which ones actually have a log.
// The UI uses this to only offer "Open Log" where there is a log to open:
// pointing at a file that does not exist would be a claim we cannot back.
export async function listLaunchedProfiles(): Promise<Set<string>> {
  try {
    const entries = await readdir(LOGS_DIR);
    return new Set(entries.filter((f) => f.endsWith(".log")).map((f) => f.slice(0, -".log".length)));
  } catch {
    // No logs directory yet: nothing was ever launched. Not a failure.
    return new Set();
  }
}

export interface LaunchHandle {
  pid?: number;
  // Resolves once the command exits — with its exit code, and with the spawn
  // error message when it never even started (folder gone, shell missing).
  // A working server never exits — that is its whole job — so for a healthy
  // launch this promise simply never settles. Which is exactly what makes it
  // informative: if it DOES settle, something is wrong, and we know it the
  // moment it happens.
  exited: Promise<{ code: number | null; error?: string }>;
}

// WHY A LOGIN SHELL, AND WHY THIS REVERSES OUR execFile RULE
//
// Everywhere else we use execFile with an args array so that no shell ever
// interprets a string. That rule protects against injection — where a hostile
// value sneaks shell syntax into a command we assembled. It does not apply here:
// `run` is a shell line YOU typed into your own profile ("npm run dev",
// "PORT=3000 vite"). Anyone able to rewrite profiles.json can already run code
// on this machine; there is no attacker to defend against, only a command to
// honor. Splitting that string ourselves would mean re-implementing shell
// parsing badly, and breaking on the first env prefix or quoted argument.
//
// It has to be a LOGIN shell (-l), not plain `sh -c`. A GUI app inherits
// launchd's minimal PATH, which on this machine does not include
// /opt/homebrew/bin — so `npm` simply would not be found. Your PATH is set by
// .zprofile (`brew shellenv`), which zsh only reads when it is a login shell.
// Nastier still: under `ray develop` the extension inherits your terminal's
// PATH, so a naive spawn works in development and breaks once installed.
// -l (not -i) is enough: it sources .zprofile without dragging in the whole
// interactive startup.
export async function launchProfile(profile: Profile): Promise<LaunchHandle> {
  await mkdir(LOGS_DIR, { recursive: true });

  // One command, passed through as written. A profile needing a build step just
  // says so itself — `npm run build && npm run dev` — and the shell's && does the
  // sequencing, stopping the chain if the build fails. That is why there is no
  // separate build field: it would have produced this exact string anyway.
  const shell = process.env.SHELL || "/bin/zsh";

  const logPath = logFileFor(profile.id);
  const oversized = await stat(logPath).then(
    (s) => s.size > LOG_RESET_BYTES,
    () => false, // no log yet: nothing to reset
  );

  // openSync (not the async open) so the descriptor exists before spawn: no race
  // between the child being created and the file being ready.
  const log = openSync(logPath, oversized ? "w" : "a");
  writeSync(log, runSeparator(profile.run));

  try {
    const child = spawn(shell, ["-l", "-c", profile.run], {
      cwd: profile.cwd,
      // The one thing the process tree cannot tell anyone later: that WE started
      // this, and as which profile. The tree tops out at "Raycast Beta" — one
      // backend for every extension, nothing naming this one — so we hand the
      // answer to the only witness that outlives us. Every child inherits it,
      // and it is still there after Raycast quits. → LAUNCH_MARK.
      env: { ...process.env, [LAUNCH_MARK]: profile.id },
      // detached makes the child a process-group leader instead of a child of
      // Raycast's backend. unref drops it from our event loop. Together they are
      // what let your server outlive the Raycast window you started it from —
      // without them, closing Raycast kills your dev server.
      detached: true,
      stdio: ["ignore", log, log],
    });
    child.unref();

    // unref() only means "don't keep Node alive for this child"; it does not cut
    // the parent link. So we still get its exit event for as long as Raycast is
    // open — and if Raycast closes first, we merely stop watching. The process
    // itself is unaffected, which is the whole point of detaching.
    const exited = new Promise<{ code: number | null; error?: string }>((resolve) => {
      child.once("exit", (code) => resolve({ code }));
      // A spawn error means the command never ran at all (folder gone, shell
      // missing). The message is the only trace there is, so it goes to the
      // log — the place every other failure leaves its reason — before we
      // report it. Swallowing it would say "exited, no output" about a thing
      // that never started.
      child.once("error", (err) => {
        appendFile(logPath, `spawn failed: ${err.message}\n`).finally(() =>
          resolve({ code: null, error: err.message }),
        );
      });
    });

    return { pid: child.pid, exited };
  } finally {
    // The child holds its own duplicate of the descriptor, so closing ours does
    // not disturb it — it only stops us leaking one handle per launch.
    closeSync(log);
  }
}

export type LaunchOutcome =
  | { kind: "listening"; listener: ListeningPort }
  | { kind: "exited"; code: number | null; log: string; error?: string }
  | { kind: "still-working" };

// How long we keep watching before we stop watching. Note what this is NOT: it
// is not a deadline for the command, and never decides that anything failed.
// A command that exits is caught the instant it exits, whatever this value is;
// a command still alive at the end of it gets reported as still alive. This only
// bounds how long a toast may spin, so it can be generous without ever lying.
//
// It is generous enough that the one outcome nothing could reach in a test was
// "still-working" — 90 seconds of real time against a suite that runs in one.
// Hence the override on watchLaunch: the same reason the number can be this
// large is the reason a test has to be able to shrink it.
export const STOP_WATCHING_AFTER_MS = 90_000;

// The last run's tail, and ONLY the last run's: the file accumulates runs, so
// without cutting at the last separator a command that failed silently would be
// "explained" by the previous run's output — a lie with a timestamp on it.
// Pure string logic, exported for the tests.
export function lastRunTail(raw: string, lines = 15): string {
  const lastSeparator = raw.lastIndexOf(RUN_SEPARATOR_PREFIX);
  const segment = lastSeparator === -1 ? raw : raw.slice(raw.indexOf("\n", lastSeparator) + 1);
  return segment.trim().split("\n").slice(-lines).join("\n").trim();
}

async function tailLog(profileId: string, lines = 15): Promise<string> {
  try {
    return lastRunTail(await readFile(logFileFor(profileId), "utf8"), lines);
  } catch {
    return "";
  }
}

// Which listener, if any, is the one THIS launch produced? Only a listener that
// was not already there before the spawn counts: the folder may well have had a
// sibling server running (dev next to storybook), and crediting the launch with
// a port that predates it would report success for a command that is dying.
// When the profile declares a port and a new listener holds exactly it, that
// one wins; otherwise any new listener in the folder does — dev servers move
// ports when their favorite is taken, and the folder never lies.
// Pure, exported for the tests.
export function pickNewListener(
  ports: ListeningPort[],
  profile: Profile,
  preexisting: Set<string>,
): ListeningPort | undefined {
  const fresh = ports.filter((p) => p.cwd === profile.cwd && !preexisting.has(`${p.pid}:${p.port}`));
  if (profile.port) {
    const declared = fresh.find((p) => p.port === String(profile.port));
    if (declared) return declared;
  }
  return fresh[0];
}

export function listenerKey(p: ListeningPort): string {
  return `${p.pid}:${p.port}`;
}

// Spawning proves nothing: a detached process that dies instantly spawns exactly
// as happily as one that works. So we watch the two things that actually mean
// something, and let whichever happens first answer.
//
//   a NEW port appears    -> it is up. Definitive. ("New" measured against the
//                            snapshot taken before the spawn — a sibling server
//                            that was already running must not answer for us.)
//   the process exits     -> it failed. Definitive, and we have the exit code
//                            AND the log, so we can say WHY rather than "check
//                            somewhere".
//   still alive, no port  -> it is still working. A build, an install, a slow
//                            boot. There is no honest reason to call this a
//                            failure: the thing is alive and doing something.
//
// This is what replaced a fixed timer. The timer had to guess how long work
// takes (20s? 60s? based on a field that told us nothing), and guessed wrong in
// both directions: it condemned slow builds that were fine, and made instant
// failures wait 20 seconds to be reported. Watching the process needs no guess,
// because the process already knows.
export async function watchLaunch(
  profile: Profile,
  handle: LaunchHandle,
  before: ListeningPort[],
  { stopAfterMs = STOP_WATCHING_AFTER_MS }: { stopAfterMs?: number } = {},
): Promise<LaunchOutcome> {
  const preexisting = new Set(before.map(listenerKey));

  let exit: { code: number | null; error?: string } | undefined;
  handle.exited.then((result) => {
    exit = result;
  });

  const deadline = Date.now() + stopAfterMs;

  while (Date.now() < deadline) {
    // Port first: if it exited, its port is gone anyway, so this ordering cannot
    // report a dead process as listening.
    const hit = pickNewListener(await readListeningPorts(), profile, preexisting);
    if (hit) return { kind: "listening", listener: hit };

    if (exit) return { kind: "exited", code: exit.code, log: await tailLog(profile.id), error: exit.error };

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return { kind: "still-working" };
}
