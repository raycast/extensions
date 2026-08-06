import { getPreferenceValues, open, Toast } from "@raycast/api";
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

export function failureToastOptions(title: string) {
  return {
    title,
    primaryAction: {
      title: "Open AeroSpace",
      onAction: (toast: Toast) => {
        open("/Applications/AeroSpace.app");
        toast.hide();
      },
    },
  };
}

function formatAerospaceError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error(String(error));
  }

  const detail = [error.message, "stderr" in error ? String(error.stderr) : ""].join("\n").toLowerCase();

  if (
    detail.includes("can't connect to aerospace server") ||
    detail.includes("connection refused") ||
    detail.includes("econnrefused")
  ) {
    return new Error("Can't connect to AeroSpace. Is AeroSpace.app running?");
  }

  if ("code" in error && error.code === "ENOENT") {
    return new Error("Could not find aerospace binary. Set the path in extension preferences.");
  }

  const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr.trim() : "";
  if (stderr) {
    return new Error(stderr.split("\n")[0] ?? stderr);
  }

  return error;
}

export async function aerospace(...args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(await resolveAerospaceBin(), args, {
      encoding: "utf8",
      timeout: 15000,
    });
    return stdout.trim();
  } catch (error) {
    throw formatAerospaceError(error);
  }
}
