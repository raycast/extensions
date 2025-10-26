import { runAppleScript } from "run-applescript";

export async function execAppleScript(script: string): Promise<string> {
  try {
    const result = await runAppleScript(script);
    return result.trim();
  } catch (error) {
    console.error("AppleScript execution failed:", error);
    throw new Error(`Failed to execute AppleScript: ${error}`);
  }
}
