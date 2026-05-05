import { showToast, Toast, confirmAlert, Alert, Keyboard } from "@raycast/api";
import type { Deployment } from "./types";
import { cancelDeployment as cancelDeploymentApi } from "./vercel";

/** Deployment states that can be canceled (building or queued). */
const CANCELLABLE_STATES = ["QUEUED", "BUILDING", "INITIALIZING"] as const;

/**
 * Whether a deployment can be canceled via the API (currently building or queued).
 */
export function isDeploymentCancellable(d: Deployment): boolean {
  const state = d.readyState ?? d.state;
  return state != null && (CANCELLABLE_STATES as readonly string[]).includes(state);
}

/**
 * Resolve the deployment identifier for API calls (id when present, otherwise uid).
 */
export function getDeploymentId(deployment: { id?: string; uid: string }): string {
  return (deployment as { id?: string }).id ?? deployment.uid;
}

/** Copy and config for the cancel deployment action and confirm dialog. */
export const CANCEL_DEPLOYMENT_ACTION = {
  title: "Cancel Deployment",
  confirmTitle: "Cancel this deployment?",
  confirmMessage: "The deployment will stop building. This cannot be undone.",
  confirmPrimaryAction: { title: "Cancel deployment", style: Alert.ActionStyle.Destructive },
  successToast: { style: Toast.Style.Success, title: "Deployment canceled" },
} as const;

/** Shortcut for the cancel deployment action (⌘⇧K / Ctrl+Shift+K). */
export const CANCEL_DEPLOYMENT_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "k" },
  Windows: { modifiers: ["ctrl", "shift"], key: "k" },
};

type CancelDeploymentOptions = {
  deployment: Deployment;
  teamId?: string;
  onSuccess?: () => void;
};

/**
 * Runs the cancel-deployment flow: confirm dialog, API call, success toast, optional onSuccess.
 * Shows failure toast on error (via cancelDeploymentApi).
 */
export async function runCancelDeployment({ deployment, teamId, onSuccess }: CancelDeploymentOptions): Promise<void> {
  const confirmed = await confirmAlert({
    title: CANCEL_DEPLOYMENT_ACTION.confirmTitle,
    message: CANCEL_DEPLOYMENT_ACTION.confirmMessage,
    primaryAction: CANCEL_DEPLOYMENT_ACTION.confirmPrimaryAction,
  });
  if (!confirmed) return;

  try {
    await cancelDeploymentApi(getDeploymentId(deployment), teamId);
    showToast(CANCEL_DEPLOYMENT_ACTION.successToast);
    onSuccess?.();
  } catch {
    // cancelDeploymentApi shows toast on error
  }
}
