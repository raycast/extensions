import { getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { access } from "fs/promises";
import { promisify } from "util";
import os from "os";
import path from "path";

const execFileAsync = promisify(execFile);

const SEARCH_PATHS = [
  "/opt/homebrew/bin/aerospace",
  "/usr/local/bin/aerospace",
  "/run/current-system/sw/bin/aerospace",
  path.join(os.homedir(), ".nix-profile/bin/aerospace"),
];

let resolved: string | null = null;

export async function resolveAerospaceBin(): Promise<string> {
  if (resolved) return resolved;

  const { aerospaceBin } = getPreferenceValues<{ aerospaceBin?: string }>();
  if (aerospaceBin) {
    await access(aerospaceBin).catch(() => {
      throw new Error(`Aerospace binary not found at: ${aerospaceBin}. Check extension preferences.`);
    });
    resolved = aerospaceBin;
    return resolved;
  }

  const results = await Promise.all(
    SEARCH_PATHS.map((p) =>
      access(p).then(
        () => p,
        () => null,
      ),
    ),
  );
  const found = results.find(Boolean);
  if (found) {
    resolved = found;
    return resolved;
  }

  throw new Error("Could not find aerospace binary. Set the path in extension preferences.");
}

export async function aerospace(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(await resolveAerospaceBin(), args, {
    encoding: "utf8",
    timeout: 15000,
  });
  return stdout.trim();
}
