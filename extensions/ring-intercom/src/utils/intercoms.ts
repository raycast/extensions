import { LaunchType, PopToRootType, Toast, launchCommand, showHUD, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Intercom, RingApi } from "../api/ring-api";
import { RingAuthenticationError, isSignedOut } from "../errors";

// Why Unlock Door opened the intercom list instead of unlocking.
export type ChooseReason = "no-default" | "default-missing";

export type Choice = { intercom: Intercom } | { reason: ChooseReason | "none" };

// Unlock Door opens only the default intercom, or the only one on the account. It never falls back to another
// door: if the default is gone, or there are several and none is the default, the user chooses.
export function chooseIntercom(intercoms: Intercom[], defaultId: string | undefined): Choice {
  if (intercoms.length === 0) {
    return { reason: "none" };
  }
  if (defaultId !== undefined) {
    const intercom = intercoms.find((candidate) => candidate.id === defaultId);
    return intercom ? { intercom } : { reason: "default-missing" };
  }
  return intercoms.length === 1 ? { intercom: intercoms[0] } : { reason: "no-default" };
}

export async function openAuthenticate() {
  try {
    await launchCommand({ name: "authenticate", type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't Open Authenticate" });
  }
}

export async function showRingFailure(error: unknown, title: string) {
  if (isSignedOut(error)) {
    await showFailureToast(error, {
      title: "Not Signed In to Ring",
      message: error.userMessage,
      primaryAction: { title: "Authenticate", onAction: () => openAuthenticate() },
    });
    return;
  }
  const message = error instanceof RingAuthenticationError ? error.userMessage : undefined;
  await showFailureToast(error, { title, message });
}

export async function unlockIntercom(api: RingApi, intercom: Intercom) {
  await showToast({ style: Toast.Style.Animated, title: `Unlocking ${intercom.name}` });
  await api.unlock(intercom);
  await showHUD(`🔓 ${intercom.name} Unlocked`, { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
}
