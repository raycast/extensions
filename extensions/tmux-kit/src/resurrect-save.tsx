import { Toast, showHUD, showToast } from "@raycast/api";
import { TmuxError, resurrectSave } from "./lib/tmux";

export default async function Command() {
  try {
    await resurrectSave();
    await showHUD("✓ tmux layout saved");
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Resurrect save failed",
      message: e instanceof TmuxError ? e.stderr || e.message : String(e),
    });
  }
}
