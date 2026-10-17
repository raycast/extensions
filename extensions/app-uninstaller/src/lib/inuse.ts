import { basename } from "path";
import { execCapture } from "./exec";

/** Raycast is reading icons out of every bundle in the list; it is never a holder worth reporting. */
const IGNORED_HOLDERS = new Set(["Raycast"]);

/**
 * Only an open file under one of these counts: it means the process is running
 * code out of the bundle. A process that merely has an `.icns` or a plist open
 * is reading metadata — Notification Center, Spotlight and Raycast itself all
 * do — and that neither blocks removal nor tells the user anything useful.
 */
const EXECUTABLE_PARTS = ["/Contents/MacOS/", ".appex/", "/Contents/Frameworks/", "/Contents/XPCServices/"];

export interface Holder {
  /** Process name, as it appears in Activity Monitor. */
  name: string;
  /** The part of the bundle it has open, for explaining why it matters. */
  component: string;
}

/**
 * Processes running code out of `path`.
 *
 * macOS refuses to move an application bundle whose code is still loaded, and
 * the application having quit is not enough on its own: an app that ships a
 * Safari, Finder or share extension leaves its `.appex` loaded inside the *host*
 * process, which goes on holding the bundle open long after the app itself is
 * gone.
 */
export async function processesUsing(path: string): Promise<Holder[]> {
  // lsof exits 1 even on a successful match, so its output has to be read
  // independently of its exit status.
  return parseHolders(await execCapture("/usr/sbin/lsof", ["-F", "pcn", "+D", path], 10_000));
}

/** Parse `lsof -F pcn` output. Exported so the filtering stays under test. */
export function parseHolders(stdout: string): Holder[] {
  const holders = new Map<string, Holder>();
  let current = "";

  for (const line of stdout.split("\n")) {
    const field = line[0];
    const value = line.slice(1);

    if (field === "c") {
      current = value;
    } else if (field === "n" && current && !IGNORED_HOLDERS.has(current)) {
      if (!EXECUTABLE_PARTS.some((part) => value.includes(part))) continue;
      if (!holders.has(current)) holders.set(current, { name: current, component: basename(value) });
    }
  }

  return [...holders.values()];
}

/** "Safari", "Safari and Finder", "Safari, Finder and Dock". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
