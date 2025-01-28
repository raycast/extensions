import { closeMainWindow } from "@raycast/api";
import { stopTimer } from "./timerManager";

interface StopTimerArguments {
  fileName: string;
}

export default async function StopTimerCommand(props: { arguments: StopTimerArguments }) {
  const { fileName } = props.arguments;
  await stopTimer(fileName);
  await closeMainWindow({ clearRootSearch: true });
}
