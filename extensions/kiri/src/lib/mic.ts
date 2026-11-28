import { execFile } from "node:child_process";
import { promisify } from "node:util";

/**
 * Is an app using the microphone (a call in FaceTime, Zoom, Meet, Teams…)?
 *
 * macOS's audio daemon (coreaudiod) holds a power assertion for every app that records, listed by
 * `pmset -g assertions` as "Created for PID: n" with "Resources: audio-in <device>". Reading that
 * list needs no microphone permission and nothing is recorded. System daemons that listen all the
 * time ("Hey Siri" in corespeechd) are left out, as are audio taps, which capture what the Mac
 * plays rather than the microphone.
 */

const run = promisify(execFile);

/** PIDs that coreaudiod says are recording from a microphone. Pure, so it can be tested. */
export function parseMicPids(assertions: string): number[] {
  const pids = new Set<number>();
  // Each assertion starts with "pid N(owner):"; the lines below it belong to it.
  const blocks = assertions.split(/\n(?=\s*pid \d+\()/);
  for (const block of blocks) {
    if (!/^\s*pid \d+\(coreaudiod\)/.test(block)) continue;
    if (/named: "com\.apple\.audio\.AudioTap/i.test(block)) continue;
    if (!/Resources:[^\n]*\baudio-in\b/.test(block)) continue;
    const m = block.match(/Created for PID:\s*(\d+)/);
    if (m) pids.add(Number(m[1]));
  }
  return [...pids];
}

/** True for a process path that is a background part of macOS, not an app someone calls from. */
export function isSystemDaemon(path: string): boolean {
  return /^\/(System\/Library|usr\/(s?bin|libexec))\//.test(path);
}

/** Parses `ps -o pid=,comm=` output into pid → executable path. */
export function parsePs(out: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*(\d+)\s+(.+?)\s*$/);
    if (m) map.set(Number(m[1]), m[2]);
  }
  return map;
}

/** True when an app is recording from a microphone, false when none is, null when unknown. */
export async function micInUse(): Promise<boolean | null> {
  try {
    const { stdout } = await run("/usr/bin/pmset", ["-g", "assertions"], { timeout: 3000 });
    const pids = parseMicPids(stdout);
    if (pids.length === 0) return false;
    const ps = await run("/bin/ps", ["-o", "pid=,comm=", "-p", pids.join(",")], { timeout: 3000 }).catch(
      (err: { stdout?: string }) => ({ stdout: err.stdout ?? "" }),
    );
    const paths = parsePs(ps.stdout);
    // A PID that has already exited is not a call.
    return pids.some((pid) => paths.has(pid) && !isSystemDaemon(paths.get(pid) ?? ""));
  } catch {
    return null;
  }
}
