import { launchCommand, LaunchType, open, showToast, Toast } from "@raycast/api";
import { AktarError } from "../api/client";

export const AKTAR_BUNDLE_ID = "com.getaktar.mac";
export const AKTAR_DOWNLOAD_URL = "https://getaktar.com";

export function describeConnectionError(error: AktarError) {
  switch (error.kind) {
    case "not-connected":
      return {
        title: "Connect to Aktar",
        description: "Run Connect to Aktar and approve the request in Aktar. You only have to do this once.",
      };
    case "unauthorized":
      return {
        title: "Aktar Rejected the Connection",
        description: "The token changed or was regenerated in Aktar. Connect again to get a new one.",
      };
    case "not-running":
      return {
        title: "Can't Reach Aktar",
        description:
          "Make sure the latest Aktar is running and Settings > Integrations > Allow local connections is on.",
      };
    default:
      return { title: "Something Went Wrong", description: error.message };
  }
}

export async function connectToAktar() {
  await launchCommand({ name: "connect", type: LaunchType.UserInitiated });
}

export async function openAktarSettings() {
  await open("aktar://settings");
}

/**
 * A failure toast that offers the fix: connecting for token problems,
 * opening Aktar's settings when it can't be reached.
 */
export async function showAktarFailure(error: unknown, title: string) {
  const message = error instanceof Error ? error.message : String(error);
  const toast: Toast.Options = { style: Toast.Style.Failure, title, message };
  if (error instanceof AktarError) {
    if (error.kind === "not-connected" || error.kind === "unauthorized") {
      toast.title = describeConnectionError(error).title;
      toast.primaryAction = { title: "Connect to Aktar", onAction: () => connectToAktar() };
    } else if (error.kind === "not-running") {
      toast.title = describeConnectionError(error).title;
      toast.primaryAction = { title: "Open Aktar Settings", onAction: () => openAktarSettings() };
      toast.secondaryAction = { title: "Download Aktar", onAction: () => open(AKTAR_DOWNLOAD_URL) };
    }
  }
  return showToast(toast);
}
