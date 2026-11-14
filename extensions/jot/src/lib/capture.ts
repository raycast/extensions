import { closeMainWindow, open, PopToRootType, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CaptureShortcut, findCli, GET_JOT_URL, pressJotShortcut } from "./cli";

/** Closes Raycast, then presses Jot's own shortcut so Jot's capture opens over the current app. */
export async function runCapture(which: CaptureShortcut) {
  if (!findCli()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Jot is not installed",
      primaryAction: { title: "Get Jot", onAction: () => open(GET_JOT_URL) },
    });
    return;
  }
  await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  try {
    await pressJotShortcut(which);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const denied = /not allowed|1002|assistive/i.test(message);
    await showFailureToast(e, {
      title: denied ? "Raycast needs Accessibility access" : "Couldn't open Jot",
      message: denied ? "System Settings → Privacy & Security → Accessibility → turn on Raycast" : message,
      primaryAction: denied
        ? {
            title: "Open Accessibility Settings",
            onAction: () => open("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"),
          }
        : undefined,
    });
  }
}
