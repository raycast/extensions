import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";

/** Raycast spawns processes without the user's shell PATH, so the Homebrew
 *  locations have to be tried explicitly. A preference overrides everything. */
const CANDIDATES = [
  "/opt/homebrew/bin/vgrid", // Apple Silicon Homebrew
  "/usr/local/bin/vgrid", // Intel Homebrew
  "/usr/bin/vgrid",
];

let cached: string | null = null;

export class VgridMissingError extends Error {
  constructor() {
    super("vgrid CLI not found. Install VisiGrid: brew install --cask visigrid/tap/visigrid");
  }
}

export function vgridPath(): string {
  if (cached) return cached;
  const pref = getPreferenceValues<Preferences>().vgridPath?.trim();
  const candidates = pref ? [pref, ...CANDIDATES] : CANDIDATES;
  for (const p of candidates) {
    try {
      accessSync(p, constants.X_OK);
      cached = p;
      return p;
    } catch {
      // keep looking
    }
  }
  throw new VgridMissingError();
}

/** Run vgrid with the given args; resolves stdout. `stdin` is piped if given. */
export function runVgrid(args: string[], stdin?: string): Promise<string> {
  const bin = vgridPath();
  return new Promise((resolve, reject) => {
    const child = execFile(bin, args, { maxBuffer: 8 * 1024 * 1024, timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message));
      } else {
        resolve(stdout);
      }
    });
    if (stdin !== undefined && child.stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }
  });
}
