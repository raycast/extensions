import { environment, showToast, Toast } from "@raycast/api";
import { createWindscribe, type Control, WindscribeError } from "./windscribe.ts";

const titles = {
  connected: "Windscribe connected",
  disconnected: "Windscribe disconnected",
  "in-progress": "Windscribe is busy",
  "already-connected": "Windscribe is already connected",
  "already-disconnected": "Windscribe is already disconnected",
};

const errorTitles = {
  missing: "Windscribe is required",
  busy: "Windscribe is busy",
  unreachable: "Windscribe is unreachable",
  "unknown-status": "Status unavailable",
  "command-failed": "Windscribe could not complete the request",
  unconfirmed: "Windscribe state could not be confirmed",
};

export async function quickControl(action: Control) {
  const progress = await showToast({ style: Toast.Style.Animated, title: "Checking Windscribe" });
  let feedback: Toast.Options;
  try {
    const result = await createWindscribe(environment.supportPath).control(action, (request) => {
      progress.title = request === "connect" ? "Connecting Windscribe" : "Disconnecting Windscribe";
    });
    feedback = {
      title: titles[result.state],
      message: result.message,
      style: result.state === "in-progress" ? Toast.Style.Failure : Toast.Style.Success,
    };
  } catch (error) {
    feedback = {
      style: Toast.Style.Failure,
      title: error instanceof WindscribeError ? errorTitles[error.code] : "Windscribe is unavailable",
      message: error instanceof WindscribeError ? error.message : "Open Windscribe to check the VPN and try again.",
    };
  }
  await progress.hide();
  await showToast(feedback);
}
