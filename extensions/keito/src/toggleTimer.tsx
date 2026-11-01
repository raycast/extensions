import { showHUD, showToast, Toast } from "@raycast/api";
import { toggleTimer } from "./services/keito/workflows";
import { describeEntry, getWorkflowContext, refreshMenuBar, showKeitoError, todayString } from "./services/useKeito";

export default async function main() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Toggling timer…" });
  try {
    const ctx = await getWorkflowContext();
    const result = await toggleTimer(ctx, todayString(ctx.session));
    await toast.hide();
    await refreshMenuBar();
    if (result.action === "stopped") await showHUD(`Timer stopped: ${describeEntry(result.entry)}`);
    else if (result.action === "restarted") await showHUD(`Timer restarted: ${describeEntry(result.entry)}`);
    else await showHUD(`Nothing to toggle. ${result.reason}`);
  } catch (error) {
    await toast.hide();
    await showKeitoError(error, "Could not toggle your timer");
  }
}
