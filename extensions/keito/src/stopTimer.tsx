import { showHUD, showToast, Toast } from "@raycast/api";
import { stopRunningTimers } from "./services/keito/workflows";
import { describeEntry, getWorkflowContext, refreshMenuBar, showKeitoError } from "./services/useKeito";

export default async function main() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Stopping timer…" });
  try {
    const stopped = await stopRunningTimers(await getWorkflowContext());
    await toast.hide();
    await refreshMenuBar();
    await showHUD(stopped.length ? `Timer stopped: ${describeEntry(stopped[0])}` : "No timer was running");
  } catch (error) {
    await toast.hide();
    await showKeitoError(error, "Could not stop your timer");
  }
}
