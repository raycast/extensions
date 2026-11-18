import { Clipboard, closeMainWindow, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { normalizeNewlines, planKeystrokes } from "./lib/keystrokes";
import { getPermissionDetails, PermissionError } from "./lib/permissions";
import { createProgressToast, formatCharacterCount, formatProgressTitle } from "./lib/progress-toast";
import { releaseShift, startTyping, type TypingSession } from "./lib/typing-script";
import { getTypingSpeed } from "./lib/typing-speed";

const permissionToastTimeoutMs = 30_000;

export default async function Command() {
  const clipboardText = await Clipboard.readText();

  if (!clipboardText) {
    await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
    return;
  }

  const preferences = getPreferenceValues<Preferences>();
  const keystrokes = planKeystrokes(normalizeNewlines(clipboardText), { softNewlines: preferences.softNewlines });
  const total = keystrokes.length;

  await closeMainWindow();

  let session: TypingSession | undefined;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: formatProgressTitle(total),
    message: "Press Esc to stop",
    primaryAction: { title: "Stop", onAction: () => session?.stop("button") },
  });
  const progressToast = createProgressToast(toast);
  let permissionToastClosed: Promise<void> | undefined;

  try {
    session = startTyping({ keystrokes, ...getTypingSpeed(preferences), initialDelay: 0.3 }, (remaining) =>
      progressToast.update(remaining),
    );
    const { stopReason, remaining } = await session.result;
    progressToast.finish();
    toast.primaryAction = undefined;

    if (stopReason) {
      toast.style = stopReason === "app-switch" ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = `Stopped after ${total - remaining} of ${formatCharacterCount(total)}`;
      toast.message = stopReason === "app-switch" ? "The frontmost app changed" : undefined;
    } else {
      toast.style = Toast.Style.Success;
      toast.title = `Typed ${formatCharacterCount(total)}`;
      toast.message = undefined;
    }
  } catch (error) {
    progressToast.finish();
    toast.primaryAction = undefined;
    toast.style = Toast.Style.Failure;
    if (error instanceof PermissionError) {
      const { title, message, settingsUrl } = getPermissionDetails(error.permission);
      toast.title = title;
      toast.message = message;
      permissionToastClosed = new Promise((resolve) => {
        toast.primaryAction = {
          title: "Open Privacy Settings",
          onAction: async () => {
            await open(settingsUrl);
            await toast.hide();
            resolve();
          },
        };
      });
    } else {
      toast.title = "Failed to type clipboard";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  } finally {
    await releaseShift().catch(() => undefined);
  }

  // Raycast unloads a no-view command once it returns, which would leave the toast's action with nothing to run.
  if (permissionToastClosed) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      permissionToastClosed,
      new Promise((resolve) => (timeout = setTimeout(resolve, permissionToastTimeoutMs))),
    ]);
    clearTimeout(timeout);
  }
}
