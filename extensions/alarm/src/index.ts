import { Toast, showHUD, showToast } from "@raycast/api";
import { addTimer, createNotification } from "./utils";

import Sherlock from "sherlockjs";

type Props = { arguments: { query: string } };

export default async function Command(props: Props) {
  const input = props.arguments.query;

  try {
    if (!input) throw new Error("Please enter a time");
    const parsed = Sherlock.parse(input);
    if (!parsed.startDate)
      throw new Error('Unable to read time. Try something like "5m", "3:40pm", or "next Friday at noon"');
    else if (parsed.isAllDay) throw new Error("Please choose a time for your alarm");
    const endTime = (parsed.startDate as Date).getTime();
    const secondsRemaining = 1 + Math.floor((endTime - new Date().getTime()) / 1000);

    const alarmName = parsed.eventTitle || input;
    const pid = createNotification(secondsRemaining, alarmName);

    await addTimer({ id: pid, inputStr: alarmName, timeMS: endTime });
    await showHUD(`⏰ Alarm set for ${alarmName}`);
  } catch (e) {
    await showToast(Toast.Style.Failure, (e as Error).message);
  }
}
