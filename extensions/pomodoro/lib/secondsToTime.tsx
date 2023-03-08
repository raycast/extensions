export function secondsToTime(secondsToDisplay: number): string {
  if (secondsToDisplay <= 0) {
    return "00:00";
  }
  const minutes = Math.floor(secondsToDisplay / 60);
  const seconds = secondsToDisplay % 60;
  return `${minutes < 10 ? `0${minutes}` : minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
}
