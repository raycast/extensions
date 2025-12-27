export function parseDateTime(dateTimeStr: string): Date {
  // Format: 20231225T143052
  const year = parseInt(dateTimeStr.substring(0, 4), 10);
  const month = parseInt(dateTimeStr.substring(4, 6), 10) - 1; // JS months are 0-indexed
  const day = parseInt(dateTimeStr.substring(6, 8), 10);
  const hour = parseInt(dateTimeStr.substring(9, 11), 10);
  const minute = parseInt(dateTimeStr.substring(11, 13), 10);
  const second = parseInt(dateTimeStr.substring(13, 15), 10);

  return new Date(year, month, day, hour, minute, second);
}

export function getMinutesUntil(departureTime: Date): number {
  const now = new Date();
  const diffMs = departureTime.getTime() - now.getTime();
  return Math.floor(diffMs / 60000);
}

export function formatMinutesUntil(minutes: number): string {
  if (minutes < 0) {
    return "Departed";
  }
  if (minutes === 0) {
    return "Now";
  }
  if (minutes === 1) {
    return "1 min";
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h${remainingMinutes}`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
