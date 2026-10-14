import { Application, launchCommand, LaunchType, open, showToast, Toast } from "@raycast/api";
import { AktarError } from "../api/client";
import { isExpiryNotSetUp } from "./expiry";

const AKTAR_BUNDLE_ID = "com.getaktar.mac";
/** Aktar for Windows from the Microsoft Store (MSIX package family). */
const AKTAR_STORE_PACKAGE = "MertTopuz.Aktar_";
/** Aktar for Windows from the installer on GitHub (its app identifier). */
const AKTAR_WINDOWS_ID = "com.getaktar.windows";
export const AKTAR_DOWNLOAD_URL = "https://getaktar.com";

/**
 * Whether `application` is Aktar: by bundle ID on macOS; on Windows by the
 * Store package or the installer's app ID, or else by name, since the app
 * ID Raycast reports for an app that isn't packaged can vary.
 */
export function isAktar(application: Application) {
  if (application.bundleId) return application.bundleId === AKTAR_BUNDLE_ID;
  const appId = application.windowsAppId ?? "";
  if (appId.startsWith(AKTAR_STORE_PACKAGE) || appId.toLowerCase() === AKTAR_WINDOWS_ID) return true;
  return application.name === "Aktar";
}

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
    case "unverified":
      return { title: "Couldn't Verify Aktar", description: error.message };
    case "outdated":
      return { title: "Update Aktar", description: error.message };
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
    if (error.kind === "not-connected" || error.kind === "unauthorized" || error.kind === "unverified") {
      toast.title = describeConnectionError(error).title;
      toast.primaryAction = { title: "Connect to Aktar", onAction: () => connectToAktar() };
    } else if (error.kind === "outdated") {
      toast.title = describeConnectionError(error).title;
      toast.primaryAction = { title: "Download Aktar", onAction: () => open(AKTAR_DOWNLOAD_URL) };
    } else if (error.kind === "not-running") {
      toast.title = describeConnectionError(error).title;
      toast.primaryAction = { title: "Open Aktar Settings", onAction: () => openAktarSettings() };
      toast.secondaryAction = { title: "Download Aktar", onAction: () => open(AKTAR_DOWNLOAD_URL) };
    } else if (isExpiryNotSetUp(error)) {
      // Aktar's message says where to set auto-delete up.
      toast.primaryAction = { title: "Open Aktar Settings", onAction: () => openAktarSettings() };
    }
  }
  return showToast(toast);
}
