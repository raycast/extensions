export function secondsToTime(secondsToDisplay: number): string {
  if (secondsToDisplay <= 0) {
    return "00:00";
  }
  const date = new Date(secondsToDisplay * 1000);
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
