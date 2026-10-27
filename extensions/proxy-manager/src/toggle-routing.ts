import { Toast, showHUD, showToast } from "@raycast/api";
import * as api from "./lib/api";
import { errorMessage, isNotRunning, launchApp } from "./lib/control";
import { statusSummary } from "./lib/presentation";

/**
 * The hotkey path: one round trip, no view, one HUD. It never launches the app
 * on its own — a fresh launch can restore the previous routing state, and then a
 * toggle would undo it instead of applying the user's intent.
 */
export default async function ToggleRouting() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Switching routing…" });

  try {
    await api.toggleRouting();
    const status = await api.getStatus();
    const targets = await api.listTargets();
    const enabled = targets.filter((target) => target.enabled).length;

    await toast.hide();
    await showHUD(`Routing ${statusSummary(status, enabled, targets.length)}`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't toggle routing";
    toast.message = errorMessage(error);
    if (isNotRunning(error)) {
      toast.primaryAction = { title: "Open Proxy Manager", onAction: () => void launchApp() };
    }
  }
}
