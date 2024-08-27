import { useState, useEffect } from "react";
import { Form, LaunchProps } from "@raycast/api";

type Values = {
  sleepAtTime: string;
};

const SLEEP_CYCLE_DURATION = 90; // Duration of one sleep cycle in minutes
const FALL_ASLEEP_BUFFER = 15; // Time in minutes to fall asleep

export default function Command(props: LaunchProps<{ arguments: Values }>) {
  const [wakeUpTimes, setWakeUpTimes] = useState<
    { time24: string; timeAMPM: string; cycles: number; recommended?: boolean }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { sleepAtTime } = props.arguments;
    calculateWakeUpTimes(sleepAtTime);
  }, [props.arguments]);

  function calculateWakeUpTimes(time: string) {
    const timePattern = /^(0?\d|1\d|2[0-3]):([0-5]\d)$/; // Regex for HH:MM format allowing optional leading zero
    if (!timePattern.test(time)) {
      setError("Invalid time format. Please enter time in HH:MM format.");
      setWakeUpTimes([]);
      return;
    }

    const [sleepHour, sleepMinute] = time.split(":").map(Number);
    const sleepTimeInMinutes = sleepHour * 60 + sleepMinute;

    const calculatedWakeUpTimes: { time24: string; timeAMPM: string; cycles: number; recommended?: boolean }[] = [];

    for (let cycles = 1; cycles <= 6; cycles++) {
      const wakeUpTimeInMinutes = (sleepTimeInMinutes + FALL_ASLEEP_BUFFER + cycles * SLEEP_CYCLE_DURATION) % (24 * 60);
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
    <Form>
      <Form.Description text={`Sleep At Time: ${props.arguments.sleepAtTime}`} />
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
