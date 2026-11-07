import { showHUD, showToast, Toast } from "@raycast/api";

const RELOGIN_HINT = "May need a log out and back in to take effect";

/** Consistent confirmation after a change. */
export async function confirmChange(message: string, applied: boolean, hud = false) {
  if (hud) {
    await showHUD(applied ? message : `${message} – ${RELOGIN_HINT.toLowerCase()}`);
  } else {
    await showToast({
      style: applied ? Toast.Style.Success : Toast.Style.Animated,
      title: message,
      message: applied ? undefined : RELOGIN_HINT,
    });
  }
}

export async function reportError(error: unknown, hud = false) {
  const msg = error instanceof Error ? error.message : String(error);
  if (hud) await showHUD(`Could not change setting: ${msg}`);
  else await showToast({ style: Toast.Style.Failure, title: "Could not change setting", message: msg });
}
