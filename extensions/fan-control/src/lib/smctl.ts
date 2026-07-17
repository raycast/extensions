import { getPreferenceValues } from "@raycast/api";
import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type FanProfile = "auto" | "quiet" | "full";

const FALLBACK_PATHS = ["/opt/homebrew/bin/smctl", "/usr/local/bin/smctl"];

async function executablePath(): Promise<string> {
  const preferredPath =
    getPreferenceValues<Preferences.Index>().smctlPath?.trim();
  const candidates = preferredPath
    ? [
        preferredPath,
        ...FALLBACK_PATHS.filter((path) => path !== preferredPath),
      ]
    : FALLBACK_PATHS;

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next common Homebrew location.
    }
  }

  throw new Error(
    "smctl is not installed. Install the signed ARM64 release from github.com/leaperone/smctl/releases, then run `sudo smctl daemon install` in Terminal.",
  );
}

export async function runSmctl(args: string[]): Promise<string> {
  const path = await executablePath();

  try {
    const { stdout, stderr } = await execFileAsync(path, args, {
      env: {
        ...process.env,
        PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
      },
      timeout: 15_000,
    });

    return stdout.trim() || stderr.trim();
  } catch (error) {
    const message =
      error instanceof Error &&
      "stderr" in error &&
      typeof error.stderr === "string"
        ? error.stderr.trim()
        : error instanceof Error
          ? error.message
          : String(error);

    throw new Error(message || "smctl could not complete the fan command.");
  }
}

export function getFanStatus(): Promise<string> {
  return runSmctl(["fan", "status"]);
}

export function applyFanProfile(profile: FanProfile): Promise<string> {
  if (profile === "auto") {
    return runSmctl(["fan", "auto"]);
  }

  return runSmctl(["fan", "profile", profile]);
}

export function setFanSpeed(rpm: number): Promise<string> {
  if (!Number.isInteger(rpm) || rpm < 1_000 || rpm > 10_000) {
    throw new Error("Enter a whole-number speed between 1,000 and 10,000 RPM.");
  }

  return runSmctl(["fan", "set", String(rpm)]);
}
