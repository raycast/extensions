import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

const script = `
tell application "System Events"
	if autohide menu bar of dock preferences then
		set autohide menu bar of dock preferences to false
		return "false"
	else
		set autohide menu bar of dock preferences to true
		return "true"
	end if
end tell
`;

export async function triggerScript(args: string): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Running...",
  });

  const result = await runAppleScript(script);
  const isAutoHide = result === "true";
  toast.style = isAutoHide ? Toast.Style.Failure : Toast.Style.Success;
  toast.title =
    args === "always" ? (isAutoHide ? "Always" : "In Full Screen Only") : isAutoHide ? "On Desktop Only" : "Never";
}
