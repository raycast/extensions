import { Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { killSummary } from "./lib/model";
import { kill } from "./lib/portcheck";
import { binary, showError } from "./lib/raycast";

/** Asks, then stops a process with portcheck's guards. Returns true if it stopped. */
export async function stopProcess(pid: number, name: string): Promise<boolean> {
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
