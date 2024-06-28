import { Detail, LaunchProps, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { calculate } from "../utils/calculations";
import { CalculationOutput } from "../utils/types";
import Actions from "./Actions";

export default function ResultsView(props: LaunchProps<{ arguments: Arguments.QuickCalculateDuration }>) {
  const { duration, playbackSpeed } = props.arguments;
  const { hours, minutes, seconds } = extractTime(duration);
  const [durationCalculation, setDurationCalculation] = useState<CalculationOutput>({
    playbackDuration: "00:00:00",
    timeSaved: "00:00:00",
    completionTime: "00:00",
  });

  useEffect(() => {
    setDurationCalculation(calculate(Number(hours), Number(minutes), Number(seconds), Number(playbackSpeed)));
  }, [hours, minutes, seconds, playbackSpeed]);

  function extractTime(duration: string): { hours: string; minutes: string; seconds: string } {
    const validationRegex = /[^0-9:]/;

    try {
      if (validationRegex.test(duration)) {
        throw new Error("Invalid characters. Please enter duration as HH:MM:SS");
      }

      if (duration.split(":").length > 3) {
        throw new Error("Invalid format. Please enter duration as HH:MM:SS");
      }

      const parts = duration.split(":").reverse();
      const seconds = parts[0] || "0";
      const minutes = parts[1] || "0";
      const hours = parts[2] || "0";

      if (Number(seconds) > 59) {
        throw new Error("Seconds must be less than 60");
      }

      if (Number(minutes) > 59) {
        throw new Error("Minutes must be less than 60");
      }

      return { hours, minutes, seconds };
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Duration",
        message: (error as Error).message,
      });
      return { hours: "0", minutes: "0", seconds: "0" };
    }
  }

  return (
    <Detail
      actions={<Actions {...durationCalculation} />}
      markdown={`## Calculated Playback Duration
  **Original Duration:** ${hours}h ${minutes}m ${seconds}s  
  **Playback Speed:** ${playbackSpeed}x
  | **New Duration** | **Time Saved** | **Completion Time** |
  | --- | --- | --- |
  | ${durationCalculation.playbackDuration} |  ${durationCalculation.timeSaved} |  ${durationCalculation.completionTime} |
  `}
    />
  );
}
