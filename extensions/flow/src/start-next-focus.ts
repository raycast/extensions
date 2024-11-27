import { Alert, Color, confirmAlert, Icon, showHUD, Toast } from "@raycast/api";
import { getCurrentPhase, isFlowInstalled, skipSession, startTimer } from "./utils";

export default async function () {
  const toast = new Toast({
    title: "Starting next focus",
    style: Toast.Style.Animated,
  });

  toast.show();

  if (!(await isFlowInstalled())) {
    toast.title = "Flow not installed";
    toast.message = "Install it from: https://flowapp.info/download";
    toast.style = Toast.Style.Failure;
    return;
  }

  const phase = await getCurrentPhase();
  if (phase !== "Flow") {
    await skipSession();
    await startTimer();
    await showHUD("Focus started");
    return;
  }

  toast.hide();

  const options: Alert.Options = {
    icon: { source: Icon.ExclamationMark, tintColor: Color.Yellow },
    title: "Currently in focus phase",
    message: "Are you sure you want to skip your next break and start a new focus session?",
  };

  if (await confirmAlert(options)) {
    await skipSession();
    await skipSession();
    await startTimer();
    await showHUD("Focus started");
  }
}
