import { CalculationOutput } from "./types";

function convertSecondsToTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds - hours * 3600) / 60);
  const remainingSeconds = seconds - hours * 3600 - minutes * 60;
  return `${Math.round(hours).toString().padStart(2, "0")}:${Math.round(minutes).toString().padStart(2, "0")}:${Math.round(remainingSeconds).toString().padStart(2, "0")}`;
}

export function calculate(hours: number, minutes: number, seconds: number, playbackSpeed: number): CalculationOutput {
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const currentTime = new Date().getTime();

  return {
    playbackDuration: convertSecondsToTime(totalSeconds / playbackSpeed),
    timeSaved: convertSecondsToTime(totalSeconds - totalSeconds / playbackSpeed),
    completionTime: new Date(currentTime + (totalSeconds / playbackSpeed) * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}
