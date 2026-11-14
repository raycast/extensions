import { Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { killSummary, stillRunning, type Target } from "./lib/model";
import { kill, list } from "./lib/portcheck";
import { binary, showError } from "./lib/raycast";

/** Asks, then stops a process with portcheck's guards. Returns true if the list changed. */
export async function stopProcess(t: Target): Promise<boolean> {
  const { pid, name } = t;
  const ok = await confirmAlert({
    title: `Stop ${name} (pid ${pid})?`,
    message: "portcheck asks it to exit, then kills it after 5 seconds. It never stops system processes.",
    icon: Icon.Stop,
    primaryAction: { title: "Stop", style: Alert.ActionStyle.Destructive },
  });
  if (!ok) {
    return false;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: `Stopping ${name}…` });
  try {
    // The list or the dialog may have been open a while: make sure the PID
    // still belongs to the process the user saw before stopping it.
    if (!stillRunning(t, await list(binary()))) {
      toast.style = Toast.Style.Failure;
      toast.title = `${name} (pid ${pid}) is no longer running`;
      toast.message = "Nothing was stopped. Refresh to see what holds the port now.";
      return true;
    }
    const s = killSummary(await kill(binary(), pid));
    toast.style = s.ok ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = s.ok ? `Stopped ${name}` : `Couldn't stop ${name}`;
    toast.message = s.text;
    return s.ok;
  } catch (err) {
    await toast.hide();
    await showError(err, `Couldn't stop ${name}`);
    return false;
  }
}
