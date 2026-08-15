import { showToast, Toast } from "@raycast/api";

import type { RimeInstallation } from "../types";
import { runSquirrelAction } from "./rime";

const TITLES = {
  reload: { running: "Deploying Rime…", success: "Rime Deployed" },
  sync: { running: "Syncing Rime User Data…", success: "Rime User Data Synced" },
} as const;

export async function performSquirrelAction(installation: RimeInstallation, action: "reload" | "sync"): Promise<void> {
  const labels = TITLES[action];
  const toast = await showToast({ style: Toast.Style.Animated, title: labels.running });
  try {
    await runSquirrelAction(installation, action);
    toast.style = Toast.Style.Success;
    toast.title = labels.success;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = action === "reload" ? "Deployment Failed" : "Sync Failed";
    toast.message = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

export async function reloadAfterChange(installation: RimeInstallation): Promise<void> {
  try {
    await performSquirrelAction(installation, "reload");
  } catch {
    // The write already succeeded. performSquirrelAction has shown a precise error.
  }
}
