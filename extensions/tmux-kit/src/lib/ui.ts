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

// Wrap arbitrary text in a Markdown code fence that can't be broken by backtick
// runs inside the text (e.g. a pane showing ``` from a README or man page).
// The fence is one backtick longer than the longest run in the content.
export function codeBlock(text: string): string {
  const longestRun = (text.match(/`+/g) ?? []).reduce(
    (max, run) => Math.max(max, run.length),
    0,
  );
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}\n${text}\n${fence}`;
}
