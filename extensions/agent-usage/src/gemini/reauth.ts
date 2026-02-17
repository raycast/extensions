import { execFile } from "child_process";
import { promisify } from "util";
import type { GeminiError } from "./types";
import { resolveGeminiCommand } from "./binary";

const execFileAsync = promisify(execFile);

export function shouldPromptGeminiReauth(errorType: GeminiError["type"] | undefined, hasPrompted: boolean): boolean {
  return errorType === "unauthorized" && !hasPrompted;
}

export function getGeminiReauthCommand(): string {
  return resolveGeminiCommand();
}

export async function launchGeminiReauth(): Promise<void> {
  await execFileAsync(getGeminiReauthCommand(), [], { timeout: 120000 });
}
