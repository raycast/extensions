import { useState, useEffect } from "react";
import { Form } from "@raycast/api";

const SLEEP_CYCLE_DURATION = 90; // Duration of one sleep cycle in minutes
const FALL_ASLEEP_BUFFER = 15; // Time in minutes to fall asleep

export default function Command() {
  const [wakeUpTimes, setWakeUpTimes] = useState<string[]>([]);

  useEffect(() => {
    calculateWakeUpTimes();
  }, []);

  function calculateWakeUpTimes() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const currentTimeInMinutes = currentHour * 60 + currentMinute + FALL_ASLEEP_BUFFER;

    const calculatedWakeUpTimes: string[] = [];

    for (let cycles = 1; cycles <= 6; cycles++) {
      const wakeUpTimeInMinutes = (currentTimeInMinutes + cycles * SLEEP_CYCLE_DURATION) % (24 * 60);
      const wakeUpHour = Math.floor(wakeUpTimeInMinutes / 60);
      const wakeUpMinute = wakeUpTimeInMinutes % 60;

      const formattedWakeUpTime24 = `${wakeUpHour.toString().padStart(2, "0")}:${wakeUpMinute.toString().padStart(2, "0")}`;
      const formattedWakeUpTime12 = formatTimeTo12Hour(wakeUpHour, wakeUpMinute);
      const recommendedText = cycles === 5 || cycles === 6 ? " (recommended)" : "";
      calculatedWakeUpTimes.push(
        `${formattedWakeUpTime24} (${formattedWakeUpTime12}) – ${cycles} cycle${cycles > 1 ? "s" : ""}${recommendedText}`,
      );
    }

    setWakeUpTimes(calculatedWakeUpTimes);
  }

  function formatTimeTo12Hour(hour: number, minute: number): string {
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
  }

  return (
    <Form>
      <Form.Description text="Recommended Wake Up Times:" />
      {wakeUpTimes.map((time, index) => (
        <Form.Description key={index} text={`• ${time}`} />
      ))}
      <Form.Description text="The cycle lasts approximately 90 minutes + it takes the average person 15 minutes to go to sleep. Good night!" />
    </Form>
  );
}
