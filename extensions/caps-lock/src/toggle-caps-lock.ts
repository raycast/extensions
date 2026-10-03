import { environment, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export default async function Command() {
  let state: string;
  try {
    const helperPath = join(environment.assetsPath, "caps-lock");
    // Extension archives may not preserve the helper's executable bit.
    await chmod(helperPath, 0o755);
    const { stdout } = await execFileAsync(helperPath, ["toggle"], { timeout: 5000 });
    state = stdout.trim();
    if (state !== "on" && state !== "off") {
      throw new Error("macOS did not return a confirmed Caps Lock state");
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not toggle Caps Lock",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const title = `Caps Lock ${state === "on" ? "On" : "Off"}`;
  try {
    // showHUD also hides the main window. A display failure must not imply
    // the confirmed state change failed and encourage another toggle.
    await showHUD(title);
  } catch (error) {
    console.error("Caps Lock changed, but Raycast could not show the HUD", error);
    await showToast({
      style: Toast.Style.Success,
      title,
      message: "Caps Lock changed, but Raycast could not show the HUD.",
    });
  }
}
