import { useState, useEffect } from "react";
import { Form, LaunchProps } from "@raycast/api";

type Values = {
  wakeUpTime: string;
};

const SLEEP_CYCLE_DURATION = 90; // Duration of one sleep cycle in minutes
const FALL_ASLEEP_BUFFER = 15; // Time in minutes to fall asleep

export default function Command(props: LaunchProps<{ arguments: Values }>) {
  const [bedtimes, setBedtimes] = useState<
    { time24: string; timeAMPM: string; cycles: number; recommended?: boolean }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { wakeUpTime } = props.arguments;
    handleSubmit({ wakeUpTime });
  }, [props.arguments]);

  function handleSubmit(values: Values) {
    const timePattern = /^(0?\d|1\d|2[0-3]):([0-5]\d)$/; // Regex for HH:MM format allowing optional leading zero
    if (!timePattern.test(values.wakeUpTime)) {
      setError("Invalid time format. Please enter time in HH:MM format.");
      setBedtimes([]);
      return;
    }

    const [wakeHour, wakeMinute] = values.wakeUpTime.split(":").map(Number);
    const wakeTimeInMinutes = wakeHour * 60 + wakeMinute;

    const calculatedBedtimes: { time24: string; timeAMPM: string; cycles: number; recommended?: boolean }[] = [];

    for (let cycles = 1; cycles <= 6; cycles++) {
      const bedtimeInMinutes =
        (wakeTimeInMinutes - FALL_ASLEEP_BUFFER - cycles * SLEEP_CYCLE_DURATION + 24 * 60) % (24 * 60);
      const bedtimeHour = Math.floor(bedtimeInMinutes / 60);
      const bedtimeMinute = bedtimeInMinutes % 60;

      const ampm = bedtimeHour >= 12 ? "PM" : "AM";
      const formattedHour12 = bedtimeHour > 12 ? bedtimeHour - 12 : bedtimeHour === 0 ? 12 : bedtimeHour;
      const formattedHour24 = bedtimeHour.toString().padStart(2, "0");
      const formattedMinute = bedtimeMinute.toString().padStart(2, "0");

      const formattedTimeAMPM = `${formattedHour12}:${formattedMinute} ${ampm}`;
      const formattedTime24 = `${formattedHour24}:${formattedMinute}`;

      const recommended = cycles === 5 || cycles === 6;

      calculatedBedtimes.unshift({
        time24: formattedTime24,
        timeAMPM: formattedTimeAMPM,
        cycles: cycles,
        recommended: recommended,
      });
    }

    setError(null);
    setBedtimes(calculatedBedtimes);
  }

  return (
    <Form>
      <Form.Description text={`Wake Up Time: ${props.arguments.wakeUpTime}`} />
      {error && <Form.Description text={error} />}
      <Form.Separator />
      <Form.Description text="Recommended Bedtimes:" />
      {bedtimes.map((bedtime, index) => (
        <Form.Description
          key={index}
          text={`• ${bedtime.time24} (${bedtime.timeAMPM}) - ${bedtime.cycles} cycles${bedtime.recommended ? " (recommended)" : ""}`}
        />
      ))}
      <Form.Description text="The cycle lasts approximately 90 minutes + it takes the average person 15 minutes to go to sleep. Good night!" />
    </Form>
  );
}
