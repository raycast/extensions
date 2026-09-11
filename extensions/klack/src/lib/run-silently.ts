import { closeMainWindow, showHUD } from "@raycast/api";
import { reportError } from "./errors";

export async function runSilently(action: () => Promise<string | undefined>) {
  void closeMainWindow();
  try {
    const hud = await action();
    if (hud) await showHUD(hud);
  } catch (err) {
    await reportError(err);
  }
}
