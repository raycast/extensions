import { duration, getCurrentInterval } from "./intervals";

export default function getTimeLeft(): string {
  const currentInterval = getCurrentInterval();
  if (!currentInterval) {
    return "--:--";
  }
  const timeLeft = currentInterval ? currentInterval.length - duration(currentInterval) : 0;

  if (timeLeft <= 0) {
    return "00:00";
  }

  const date = new Date(timeLeft * 1000);
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
