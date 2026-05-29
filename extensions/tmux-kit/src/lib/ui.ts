import { Toast, showToast } from "@raycast/api";
import { TmuxError } from "./tmux";

// Shared failure toast: unwraps TmuxError.stderr when present so the user sees
// tmux's own message, not a generic wrapper.
export async function toastError(title: string, e: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: e instanceof TmuxError ? e.stderr || e.message : String(e),
  });
}
