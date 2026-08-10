import { showHUD, Toast, getPreferenceValues, LaunchProps } from "@raycast/api";
import { isFlowInstalled, setSessionTitle, startTimer } from "./utils";

interface Preferences {
  defaultTitle?: string;
}

export default async function (props: LaunchProps<{ arguments: { title?: string } }>) {
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
  const { defaultTitle } = getPreferenceValues<Preferences>();
  const title = (props.arguments.title || defaultTitle || "").trim();

  if (title) {
    await setSessionTitle(title);
  }

  await startTimer();
  await showHUD(title ? `Timer started · ${title}` : "Timer started");
}
