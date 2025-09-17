import { execFile } from "child_process";
import { promisify } from "util";
import {
  isAuthenticationError,
  handleAuthenticationError,
} from "./utils/AuthErrorHandler";

const execFileAsync = promisify(execFile);

// Resolve the Azure CLI binary path in a robust way.
// Order: explicit env var -> PATH ("az") -> common Homebrew path -> common Intel path -> system path.
const CANDIDATE_PATHS = [
  process.env.AZ_CLI?.trim(),
  "az",
  "/opt/homebrew/bin/az",
  "/usr/local/bin/az",
  "/usr/bin/az",
].filter(Boolean) as string[];

let cachedAzPath: string | null = null;

export async function resolveAz(): Promise<string> {
  if (cachedAzPath) return cachedAzPath;

  for (const candidate of CANDIDATE_PATHS) {
    try {
      // Try a lightweight command to validate the binary exists and is runnable
      await execFileAsync(candidate, ["--version"], { maxBuffer: 256 * 1024 });
      cachedAzPath = candidate;
      return candidate;
    } catch {
      // Try next candidate
    }
  }

  throw new Error(
    "Azure CLI (az) not found. Install Azure CLI or set AZ_CLI env variable to the az binary path.",
  );
}

export async function runAz(
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  const az = await resolveAz();

  try {
    return await execFileAsync(az, args, { maxBuffer: 2 * 1024 * 1024 });
  } catch (error) {
    // Check if this is an authentication error
    if (isAuthenticationError(error)) {
      await handleAuthenticationError(error);
      // Re-throw with a cleaner error message
      throw new Error(
        "Azure DevOps authentication required. Please login and try again.",
      );
    }
    // Re-throw other errors as-is
    throw error;
  }
}
