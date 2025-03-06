import { Toast } from "@raycast/api";
import { startTimer } from "./backend/timerBackend";
import { CTInlineArgs } from "./backend/types";

export default async function TimerView(props: { arguments: CTInlineArgs }) {
  const hasArgs = Object.values(props.arguments).some((x) => x !== "");

  if (!hasArgs) {
    const toast = new Toast({ style: Toast.Style.Failure, title: "Please enter a time" });
    toast.show();
    return null;
  }

  const { hours: hr, minutes: min, seconds: sec } = props.arguments;
  if ((hr && isNaN(Number(hr))) || (min && isNaN(Number(min))) || (sec && isNaN(Number(sec)))) {
    const toast = new Toast({ style: Toast.Style.Failure, title: "Please enter a valid time" });
    toast.show();
    return null;
  }

  const [hours, minutes, seconds] = (["hours", "minutes", "seconds"] as const).map(
    (k) => Number(props.arguments[k]) || 0,
  );

  await startTimer({
    timeInSeconds: 3600 * hours + 60 * minutes + seconds,
  });
}
