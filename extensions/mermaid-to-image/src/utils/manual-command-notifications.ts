import { Toast, showToast } from "@raycast/api";
import { type ResolvedEngine } from "../renderers/types";
import { ManagedBrowserInstallError } from "./browser-errors";
import { showActionFailureToast, showAnimatedStatusToast, showSuccessToast } from "./notifications";

export async function notifyManualGenerationStarted(source: string) {
  await showAnimatedStatusToast("Generating diagram...", `Source: ${source}`);
}

export async function notifyManualGenerationSuccess(source: string, engine: ResolvedEngine) {
  await showSuccessToast("Diagram generated successfully", `Source: ${source}, Renderer: ${engine}`);
}

export async function notifyManualGenerationFailure(error: unknown, message: string) {
  await showActionFailureToast(error, "Diagram Generation Failed", message);
}

export async function notifyManagedBrowserDownloadStarted() {
  return showToast({
    style: Toast.Style.Animated,
    title: "Downloading managed browser...",
    message: "Compatible rendering will store it locally for reuse.",
  });
}

export function notifyManagedBrowserDownloadProgress(toast: Toast, message: string) {
  toast.message = message;
}

export function notifyManagedBrowserDownloadSuccess(toast: Toast, source: string, supportRoot: string) {
  toast.style = Toast.Style.Success;
  toast.title = "Managed browser ready";
  toast.message = `Using ${source} browser from ${supportRoot}`;
}

export async function notifyManagedBrowserDownloadFailure(error: unknown) {
  const title = error instanceof ManagedBrowserInstallError ? "Browser download failed" : "Setup failed";
  await showActionFailureToast(error, title);
}

export async function notifyManualGenerationCancelled() {
  await showSuccessToast("Operation cancelled", "Temporary files have been cleaned up");
}
