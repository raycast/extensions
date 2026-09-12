export function formatTime(date: string): string {
  const dateObj = new Date(date);
  const hours = dateObj.getHours().toString().padStart(2, "0");
  const minutes = dateObj.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getCurrentTime(): string {
  const currentHour = new Date().getHours().toString().padStart(2, "0");
  const currentDate = new Date();
  currentDate.setHours(parseInt(currentHour), 0, 0, 0);

  const timezoneOffset = currentDate.getTimezoneOffset() * 60000;
  const localDate = new Date(currentDate.getTime() - timezoneOffset);
  const isoString = localDate.toISOString().slice(0, -5); // Remove milliseconds part
  return isoString + "+02:00";
}
