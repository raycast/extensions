import { execFile } from "node:child_process";

export const OSA_TIMEOUT_MS = 10000;
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = (error as Error & { stderr?: string }).stderr?.trim() || error.message;
    if (message.includes("-1743")) {
      return "Allow Raycast in System Settings → Privacy & Security → Automation, then try again.";
    }
    return message;
  }
  return String(error);
}

/**
 * Executes a binary directly without spawning a shell.
 */
export function execBinary(
  file: string,
  args: string[],
  options: { timeout?: number; env?: NodeJS.ProcessEnv } = {},
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      {
        timeout: options.timeout ?? OSA_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
        env: options.env,
      },
      (error, stdout, stderr) => {
        if (error) {
          const enriched = Object.assign(error, { stdout, stderr });
          reject(enriched);
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });
}

export async function runAppleScript(
  script: string,
  args: string[] = [],
  language: "AppleScript" | "JavaScript" = "AppleScript",
): Promise<string> {
  try {
    // Native packaging tools also import this module outside Raycast's runtime.
    const { runAppleScript: runRaycastAppleScript } = await import("@raycast/utils");
    const stdout = await runRaycastAppleScript(script, args, {
      language,
      timeout: OSA_TIMEOUT_MS,
      humanReadableOutput: true,
    });
    return stdout.trimEnd();
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export function getRaycastPaths(): { assetsPath?: string; supportPath?: string } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raycast = require("@raycast/api");
    return {
      assetsPath: raycast.environment?.assetsPath,
      supportPath: raycast.environment?.supportPath,
    };
  } catch {
    return {};
  }
}
