import { SwiftError } from "swift:../../native";
import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const BRIDGE_PATH = `${environment.assetsPath}/compiled_raycast_swift/native`;

export async function runNativeBridge(...args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(BRIDGE_PATH, args, {
      timeout: ["choose-background", "share-image", "import-photos"].includes(
        args[0],
      )
        ? 10 * 60_000
        : 60_000,
      maxBuffer: 1024 * 1024,
    });
    return stdout.trim();
  } catch (error) {
    if (error instanceof SwiftError) throw error;
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
