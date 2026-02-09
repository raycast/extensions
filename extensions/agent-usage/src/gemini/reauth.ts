import { execFileSync } from "child_process";
import type { GeminiError } from "./types";
import { resolveGeminiCommand } from "./binary";

export function shouldPromptGeminiReauth(errorType: GeminiError["type"] | undefined, hasPrompted: boolean): boolean {
  return errorType === "unauthorized" && !hasPrompted;
}

export function getGeminiReauthCommand(): string {
  return resolveGeminiCommand();
}

export async function launchGeminiReauth(): Promise<void> {
  execFileSync(getGeminiReauthCommand(), [], { timeout: 120000 });
}
