import { Toast, showHUD, showToast } from "@raycast/api";
import { TmuxError, resurrectRestore } from "./lib/tmux";

export default async function Command() {
  try {
    await resurrectRestore();
    await showHUD("✓ tmux layout restored");
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Resurrect restore failed",
      message: e instanceof TmuxError ? e.stderr || e.message : String(e),
    });
  }
}
