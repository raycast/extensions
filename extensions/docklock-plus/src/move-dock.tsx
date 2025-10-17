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

  const success: boolean = result.status === 0 && !/^Failed/.test(result.stdout);

  if (success) {
    showToast(Toast.Style.Success, `Dock moved ${direction} successfully`);
    closeMainWindow();
  } else {
    const exitCode: number | string = result.status ?? "unknown";
    const stderr: string = result.stderr?.toString().trim() || "no stderr";
    const stdout: string = result.stdout?.toString().trim() || "";
    console.error(`Command 'move ${direction}' failed`, { exitCode, stdout, stderr });
    showFailureToast("", { title: `Failed to move Dock ${direction}` });
  }
}
