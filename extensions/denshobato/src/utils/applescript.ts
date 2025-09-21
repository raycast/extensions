import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function execAppleScript(script: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);

    if (stderr) {
      throw new Error(`AppleScript error: ${stderr}`);
    }

    return stdout.trim();
  } catch (error) {
    console.error("AppleScript execution failed:", error);
    throw new Error(`Failed to execute AppleScript: ${error}`);
  }
}
