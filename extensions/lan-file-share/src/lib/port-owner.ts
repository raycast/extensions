import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PortOwner } from "./types";

const run = promisify(execFile);
const LSOF = "/usr/sbin/lsof";

/**
 * Processes listening on a TCP port. `lsof` is asked for the pid, the command name and the user, which is what
 * the panel needs to explain a port conflict. Matching by port keeps this precise, unlike matching a command line.
 */
export async function findPortOwners(port: number): Promise<PortOwner[]> {
  if (!Number.isInteger(port)) return [];
  try {
    const { stdout } = await run(
      LSOF,
      ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-F", "pcu"],
      { timeout: 3000 },
    );
    return parseOwners(stdout);
  } catch {
    // lsof exits non-zero when nothing matches.
    return [];
  }
}

export async function findPortOwner(
  port: number,
): Promise<PortOwner | undefined> {
  return (await findPortOwners(port))[0];
}

function parseOwners(output: string): PortOwner[] {
  const owners: PortOwner[] = [];
  let current: Partial<PortOwner> = {};
  const flush = () => {
    if (current.pid !== undefined) {
      owners.push({
        pid: current.pid,
        command: current.command ?? "unknown",
        user: current.user ?? "unknown",
      });
    }
    current = {};
  };
  for (const line of output.split("\n")) {
    if (line === "") continue;
    const value = line.slice(1);
    switch (line[0]) {
      case "p":
        flush();
        current.pid = Number(value);
        break;
      case "c":
        current.command = value;
        break;
      case "u":
        current.user = value;
        break;
      default:
        break;
    }
  }
  flush();
  return owners;
}
