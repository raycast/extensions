import { Toast, showToast } from "@raycast/api";
import { getAppleScriptErrorCode } from "./multi";

export function showMultiScriptErrorToast(error: unknown) {
  switch (getAppleScriptErrorCode(error)) {
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
      return;

    case -1001:
      showToast({
        style: Toast.Style.Failure,
        title: "Multi is starting",
        message: "Make sure Multi is logged in and try again.",
      });
      return;

    case -1002:
      showToast({
        style: Toast.Style.Failure,
        title: "Multi is logging in",
        message: "Wait for Multi to finish Log in and try again.",
      });
      return;

    case 1004:
      showToast({
        style: Toast.Style.Failure,
        title: "Multi is logging out",
        message: "Log in on Multi and try again.",
      });
      return;

    case -1005:
      showToast({
        style: Toast.Style.Failure,
        title: "Multi is logged out",
        message: "Log in on Multi and try again.",
      });
      return;

    case -1050:
      showToast({
        style: Toast.Style.Failure,
        title: "Not in a session",
        message: "Join a session to run this command.",
      });
      return;

    default:
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: "Make sure both Multi and this extension are up-to-date and try again.",
      });
  }
}
