import { Toast } from "@raycast/api";
import { conversationAwarenessSubtitle, listeningModeSubtitle } from "../features/presentation";
import { createCopyErrorAction, getErrorMessage } from "../feedback/error-actions";
import { totalReadFailureIncludes, type StatusRefreshResult } from "./result";

function fulfilledStatusMessage(result: StatusRefreshResult): string {
  const parts: string[] = [];
  if (result.listeningMode.status === "fulfilled") {
    parts.push(`Listening Mode: ${listeningModeSubtitle(result.listeningMode.value)}`);
  }
  if (result.conversationAwareness.status === "fulfilled") {
    parts.push(`Conversation Awareness: ${conversationAwarenessSubtitle(result.conversationAwareness.value)}`);
  }
  return parts.join(" · ");
}

function failureMessage(result: StatusRefreshResult): string {
  const failures: Array<{ label: string; message: string }> = [];
  if (result.listeningMode.status === "rejected") {
    failures.push({ label: "Listening Mode", message: getErrorMessage(result.listeningMode.reason) });
  }
  if (result.conversationAwareness.status === "rejected") {
    failures.push({
      label: "Conversation Awareness",
      message: getErrorMessage(result.conversationAwareness.reason),
    });
  }

  if (failures.length === 2 && failures[0].message === failures[1].message) {
    return failures[0].message;
  }
  return failures.map(({ label, message }) => `${label}: ${message}`).join(" · ");
}

function subtitleDispatchFailureMessage(result: StatusRefreshResult): string {
  const failures: Array<{ label: string; message: string }> = [];
  if (result.subtitleDispatch.listeningMode.status === "rejected") {
    failures.push({
      label: "Listening Mode subtitle",
      message: getErrorMessage(result.subtitleDispatch.listeningMode.reason),
    });
  }
  if (result.subtitleDispatch.conversationAwareness.status === "rejected") {
    failures.push({
      label: "Conversation Awareness subtitle",
      message: getErrorMessage(result.subtitleDispatch.conversationAwareness.reason),
    });
  }
  return failures.map(({ label, message }) => `${label}: ${message}`).join(" · ");
}

export async function finishToast(toast: Toast, result: StatusRefreshResult): Promise<void> {
  const listeningSucceeded = result.listeningMode.status === "fulfilled";
  const conversationSucceeded = result.conversationAwareness.status === "fulfilled";
  const listeningRefreshLaunched = result.subtitleDispatch.listeningMode.status === "fulfilled";
  const conversationRefreshLaunched = result.subtitleDispatch.conversationAwareness.status === "fulfilled";

  if (listeningSucceeded && conversationSucceeded && listeningRefreshLaunched && conversationRefreshLaunched) {
    toast.style = Toast.Style.Success;
    toast.title = "Status read";
    toast.message = fulfilledStatusMessage(result);
    toast.primaryAction = undefined;
    toast.secondaryAction = undefined;
  } else if (totalReadFailureIncludes(result, "no-device") && listeningRefreshLaunched && conversationRefreshLaunched) {
    toast.style = Toast.Style.Success;
    toast.title = "Not connected";
    toast.message = "Connect your AirPods or Beats to your Mac and try again.";
    toast.primaryAction = undefined;
    toast.secondaryAction = undefined;
  } else {
    const partial = listeningSucceeded || conversationSucceeded;
    const confirmed = fulfilledStatusMessage(result);
    const readFailure = failureMessage(result);
    const dispatchFailure = subtitleDispatchFailureMessage(result);
    const failures = [readFailure, dispatchFailure].filter(Boolean);
    const message = [confirmed, ...failures].filter(Boolean).join(" · ");

    toast.style = Toast.Style.Failure;
    if (dispatchFailure && !readFailure) {
      toast.title = "Could not refresh subtitles";
    } else {
      toast.title = partial ? "Status partially read" : "Failed to read status";
    }
    toast.message = message;
    toast.primaryAction = createCopyErrorAction(message);
    toast.secondaryAction = undefined;
  }

  await toast.show();
}
