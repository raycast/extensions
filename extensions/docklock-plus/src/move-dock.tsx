import { showFailureToast } from "@raycast/utils";
import { isDockLockPlusInstalled, isDockMovable } from "./utils";
import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { spawnSync } from "child_process";

export async function moveDock(direction: "up" | "down" | "left" | "right"): Promise<void> {
  if (!isDockLockPlusInstalled()) {
    showFailureToast("", { title: "DockLock Plus not installed. Install it at https://docklockpro.com" });
    return;
  }

  const movable = await isDockMovable();
  if (!movable) {
    showFailureToast("", { title: "Dock move not allowed for this mode." });
    return;
  }

  const result: ReturnType<typeof spawnSync> = spawnSync(
    "/Applications/DockLock Plus.app/Contents/MacOS/DockLock Plus",
    ["move", direction],
    {
      encoding: "utf8",
    },
  );

  const stdoutString: string =
    typeof result.stdout === "string"
      ? result.stdout
      : Buffer.isBuffer(result.stdout)
        ? result.stdout.toString("utf8")
        : "";

  const success: boolean = result.status === 0 && !/^Failed/.test(stdoutString);

  if (success) {
    showToast(Toast.Style.Success, `Dock moved ${direction} successfully`);
    closeMainWindow();
  } else {
    const exitCode = result.status ?? "unknown";

    const stdout: string =
      typeof result.stdout === "string"
        ? result.stdout.trim()
        : Buffer.isBuffer(result.stdout)
          ? result.stdout.toString("utf8").trim()
          : "";

    const stderr: string =
      typeof result.stderr === "string"
        ? result.stderr.trim()
        : Buffer.isBuffer(result.stderr)
          ? result.stderr.toString("utf8").trim()
          : "";

    console.error(`Command 'move ${direction}' failed`, {
      exitCode,
      stdout,
      stderr,
    });
    showFailureToast("", { title: `Failed to move Dock ${direction}` });
  }
}
