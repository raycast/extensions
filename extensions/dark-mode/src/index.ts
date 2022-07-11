import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Toggling dark mode...",
  });

  try {
    await runAppleScript('tell app "System Events" to tell appearance preferences to set dark mode to not dark mode');

    toast.style = Toast.Style.Success;
    toast.title = "Dark mode toggled";
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to toggle dark mode";
    toast.message = String(e);
  }
}
