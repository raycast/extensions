export function formatTime(date: string): string {
  const dateObj = new Date(date);
  const hours = dateObj.getHours().toString().padStart(2, "0");
  const minutes = dateObj.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function relativeDate(date: string): string {
  const dateObj = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formattedDate = dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "numeric" });

  if (dateObj.toDateString() === today.toDateString()) {
    return `Today (${formattedDate})`;
  } else if (dateObj.toDateString() === yesterday.toDateString()) {
    return `Yesterday (${formattedDate})`;
  } else if (dateObj.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow (${formattedDate})`;
  } else {
    return formattedDate;
  }
}

export function getCurrentTime(): string {
  const currentHour = new Date().getHours().toString().padStart(2, "0");
  const currentDate = new Date();
  currentDate.setHours(parseInt(currentHour), 0, 0, 0);

  // Adjust the time to the local timezone offset
  const timezoneOffset = currentDate.getTimezoneOffset() * 60000;
  const localDate = new Date(currentDate.getTime() - timezoneOffset);
  const isoString = localDate.toISOString().slice(0, -5); // Remove milliseconds part
  return isoString + "+02:00";
}
