import { Toast, showToast, open } from "@raycast/api";
import { getAppleScriptErrorCode } from "./multi";

export function showMultiScriptErrorToastAndLogError(error: unknown, functionName: string) {
  const knownError = showMultiScriptErrorToast(error);
  if (knownError) {
    console.warn(`Known error while executing ${functionName}`, error);
  } else {
    console.error(`Unknown error while executing ${functionName}`, error);
  }
}

/**
 * Show a toast to the user representing the given error.
 * @param error The error to render as a toast
 * @returns true if it is a known error, false if it is an unknown error.
 */
function showMultiScriptErrorToast(error: unknown): boolean {
  switch (getAppleScriptErrorCode(error)) {
    case -1743:
      showToast({
        style: Toast.Style.Failure,
        title: "Permission denied",
        message: "Enable Raycast Automation permission to control Multi and try again.",
        primaryAction: {
          title: "Go to Automation Permissions",
          onAction: () => {
            open("x-apple.systempreferences:com.apple.preference.security?Privacy_Automation");
          },
        },
      });
      return true;

    case -2700:
      showToast({
        style: Toast.Style.Failure,
        title: "Multi is not installed",
        message: "Install Multi and try again.",
        primaryAction: {
          title: "Get Multi",
          onAction: () => {
            open("https://multi.app");
          },
        },
      });
      return true;

    case -1001:
      showToast({
        style: Toast.Style.Failure,
        title: "Multi is starting",
        message: "Make sure Multi is logged in and try again.",
      });
      return true;

    case -1002:
      showToast({
        style: Toast.Style.Failure,
        title: "Multi is logging in",
        message: "Wait for Multi to finish Log in and try again.",
      });
      return true;

    case -1004:
      showToast({
        style: Toast.Style.Failure,
        title: "Multi is logging out",
        message: "Log in on Multi and try again.",
      });
      return true;

    case -1005:
      showToast({
        style: Toast.Style.Failure,
        title: "Multi is logged out",
        message: "Log in on Multi and try again.",
      });
      return true;

    case -1050:
      showToast({
        style: Toast.Style.Failure,
        title: "Not in a session",
        message: "Join a session to run this command.",
      });
      return true;

    default:
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: "Make sure both Multi and this extension are up-to-date and try again.",
      });
      return false;
  }
}
