export function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  let formattedTime = "";

  formattedTime += hours.toString().padStart(2, "0") + ":";
  formattedTime += minutes.toString().padStart(2, "0") + ":";
  formattedTime += secs.toString().padStart(2, "0");

  return formattedTime;
}
