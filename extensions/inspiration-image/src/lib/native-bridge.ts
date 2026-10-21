import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const BRIDGE_PATH = `${environment.assetsPath}/native-bridge`;

export async function runNativeBridge(...args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(BRIDGE_PATH, args, {
      timeout: 0,
      maxBuffer: 1024 * 1024,
    });
    return stdout.trim();
  } catch (error) {
    const detail = error as NodeJS.ErrnoException & { stderr?: string };
    const message =
      detail.stderr?.trim() ||
      (error instanceof Error ? error.message : String(error));
    throw new Error(
      message.replace(/^Command failed:.*\n/, "").trim() ||
        "The macOS operation failed. Please try again.",
    );
  }
}
