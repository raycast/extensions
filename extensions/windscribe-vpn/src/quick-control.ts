import { environment, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
  let result;
  try {
    result = await createWindscribe(environment.supportPath)
      .control(action, (request) => {
        progress.title = request === "connect" ? "Connecting Windscribe" : "Disconnecting Windscribe";
      })
      .finally(() => progress.hide());
  } catch (error) {
    await showFailureToast(
      error instanceof WindscribeError ? error : new Error("Open Windscribe to check the VPN and try again."),
      { title: error instanceof WindscribeError ? errorTitles[error.code] : "Windscribe is unavailable" },
    );
    return;
  }
  await showToast({
    title: titles[result.state],
    message: result.message,
    style: result.state === "in-progress" ? Toast.Style.Failure : Toast.Style.Success,
  });
}
