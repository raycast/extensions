// Running instances of an app by bundle ID, through the system's lsappinfo (SPEC.md §4.2 hotkey quit commands).
import { execFile } from "node:child_process";
import { parseAsns, parsePid } from "./lib/lsappinfo.ts";

const LSAPPINFO = "/usr/bin/lsappinfo";

function run(args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile(LSAPPINFO, args, { timeout: 2000, maxBuffer: 1024 * 1024 }, (error, stdout) =>
      resolve(error ? "" : stdout),
    );
  });
}

/** Pids of every running instance of the bundle, or [] when none (or when lsappinfo is unavailable). */
export async function pidsForBundle(bundleId: string): Promise<number[]> {
  const asns = parseAsns(await run(["find", `bundleID=${bundleId}`]));
  const pids = await Promise.all(asns.map(async (asn) => parsePid(await run(["info", "-only", "pid", asn]))));
  return pids.filter((p): p is number => p !== undefined);
}
