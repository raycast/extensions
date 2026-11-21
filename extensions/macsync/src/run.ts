import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";

// Raycast has a minimal PATH, so look where Homebrew and the app put the same CLI.
const CANDIDATES = [
  "/opt/homebrew/bin/macsync",
  "/usr/local/bin/macsync",
  "/Applications/MacSync.app/Contents/Helpers/macsync",
  `${homedir()}/Applications/MacSync.app/Contents/Helpers/macsync`,
];

export function macsync(...args: string[]): Promise<string> {
  const binary = CANDIDATES.find((path) => existsSync(path));
  if (!binary) return Promise.reject(new Error("MacSync isn't installed."));
  return new Promise((resolve, reject) => {
    execFile(binary, args, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr.trim() || err.message));
      else resolve(stdout.trim());
    });
  });
}

export function failure(e: unknown): string {
  return "MacSync: " + (e as Error).message;
}
