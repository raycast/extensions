import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { startTimer } from "./timerManager";

interface StartTimerArguments {
  minutes?: number;
}

export default async function StartTimerCommand(props: { arguments: StartTimerArguments }) {
  const { minutes } = props.arguments;
  if (!minutes) {
    return;
  }

  if (isNaN(minutes) || minutes <= 0) {
    await showToast(Toast.Style.Failure, "Invalid number of minutes");
    return;
  }

  await startTimer(minutes * 60, `${minutes} minutes`);
  await closeMainWindow({ clearRootSearch: true });
}
