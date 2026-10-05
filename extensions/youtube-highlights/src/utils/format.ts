export function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "00:00:00";

  const totalSeconds = Math.floor(seconds);
  const sign = totalSeconds < 0 ? "-" : "";
  const absSeconds = Math.abs(totalSeconds);

  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;

  const formattedHours = hours.toString().padStart(2, "0");
  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = secs.toString().padStart(2, "0");

  return `${sign}${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}
