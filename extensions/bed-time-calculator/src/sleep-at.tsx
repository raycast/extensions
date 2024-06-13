import { useState } from "react";
import { Form, ActionPanel, Action } from "@raycast/api";

type Values = {
  bedtime: string;
};

const SLEEP_CYCLE_DURATION = 90; // Duration of one sleep cycle in minutes
const FALL_ASLEEP_BUFFER = 15; // Time in minutes to fall asleep

export default function Command() {
  const [wakeUpTimes, setWakeUpTimes] = useState<
    { time24: string; timeAMPM: string; cycles: number; recommended?: boolean }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(values: Values) {
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/; // Regex for HH:MM format
    if (!timePattern.test(values.bedtime)) {
      setError("Invalid time format. Please enter time in HH:MM format.");
      setWakeUpTimes([]);
      return;
    }

    const [bedHour, bedMinute] = values.bedtime.split(":").map(Number);
    const bedTimeInMinutes = bedHour * 60 + bedMinute;

    const calculatedWakeUpTimes: { time24: string; timeAMPM: string; cycles: number; recommended?: boolean }[] = [];

    for (let cycles = 1; cycles <= 6; cycles++) {
      const wakeUpTimeInMinutes = (bedTimeInMinutes + FALL_ASLEEP_BUFFER + cycles * SLEEP_CYCLE_DURATION) % (24 * 60);
      const wakeUpHour = Math.floor(wakeUpTimeInMinutes / 60);
      const wakeUpMinute = wakeUpTimeInMinutes % 60;

      const ampm = wakeUpHour >= 12 ? "PM" : "AM";
      const formattedHour12 = wakeUpHour > 12 ? wakeUpHour - 12 : wakeUpHour === 0 ? 12 : wakeUpHour;
      const formattedHour24 = wakeUpHour.toString().padStart(2, "0");
      const formattedMinute = wakeUpMinute.toString().padStart(2, "0");

      const formattedTimeAMPM = `${formattedHour12}:${formattedMinute} ${ampm}`;
      const formattedTime24 = `${formattedHour24}:${formattedMinute}`;

      const recommended = cycles === 5 || cycles === 6;

      calculatedWakeUpTimes.unshift({
        time24: formattedTime24,
        timeAMPM: formattedTimeAMPM,
        cycles: cycles,
        recommended: recommended,
      });
    }

    setError(null);
    setWakeUpTimes(calculatedWakeUpTimes);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate Wake Up Times" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="bedtime" title="Bedtime (HH:MM)" placeholder="22:00" />
      {error && <Form.Description text={error} />}
      <Form.Separator />
      <Form.Description text="Recommended Wake Up Times:" />
      {wakeUpTimes.map((wakeUpTime, index) => (
        <Form.Description
          key={index}
          text={`• ${wakeUpTime.time24} (${wakeUpTime.timeAMPM}) - ${wakeUpTime.cycles} cycles${wakeUpTime.recommended ? " (recommended)" : ""}`}
        />
      ))}
      <Form.Description text="The cycle lasts approximately 90 minutes + it takes the average person 15 minutes to fall asleep. Have a good morning!" />
    </Form>
  );
}
