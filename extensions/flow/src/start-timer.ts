import { showHUD, Toast, getPreferenceValues, LaunchProps } from "@raycast/api";
import { isFlowInstalled, setSessionTitle, startTimer } from "./utils";

export default async function (props: LaunchProps<{ arguments: Arguments.StartTimer }>) {
  const toast = new Toast({
    title: "Starting timer",
    style: Toast.Style.Animated,
  });

  toast.show();

  if (!(await isFlowInstalled())) {
    toast.title = "Flow not installed";
    toast.message = "Install it from: https://flowapp.info/download";
    toast.style = Toast.Style.Failure;
    return;
  }

  // Priority: typed argument, then the default title preference, otherwise leave the current title untouched.
  // Trim before the fallback so a whitespace-only argument still yields the default title.
  const { defaultTitle } = getPreferenceValues<Preferences.StartTimer>();
  const title = props.arguments.title?.trim() || defaultTitle?.trim() || "";

  if (title) {
    await setSessionTitle(title);
  }

  await startTimer();
  await showHUD(title ? `Timer started · ${title}` : "Timer started");
}
