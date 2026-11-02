import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";

/**
 * B-Side takes commands as `bside://<command>` URLs (WidgetCommand in the
 * app). It starts the app when it is not running. `open -g` leaves B-Side
 * in the background; only Show brings it forward.
 */
type Command = "toggle" | "next" | "previous" | "vibe" | "show";

export async function send(command: Command, hud: string) {
  const args = command === "show" ? [`bside://${command}`] : ["-g", `bside://${command}`];
  try {
    await new Promise<void>((resolve, reject) =>
      execFile("open", args, (error) => (error ? reject(error) : resolve())),
    );
    await closeMainWindow();
    if (command !== "show") await showHUD(hud);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "B-Side is not installed",
      message: "Get it at b-side.anhile.com",
    });
  }
}
