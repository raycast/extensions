import { format, isSameDay, subDays } from "date-fns";

export function formatStrain(strain?: number) {
  return parseFloat((strain || 0).toFixed(1));
}

export function formatHeartRate(heartRate?: number) {
  return Math.round(heartRate || 0);
}

export function formatDate(dateString: string, formatString: string, relational?: boolean) {
  if (isNaN(Date.parse(dateString))) {
    return undefined;
  }

  const date = new Date(dateString);
  const today = new Date();
  const yesterday = subDays(new Date(), 1);

  if (relational && isSameDay(date, today)) {
    return "Today";
  } else if (relational && isSameDay(date, yesterday)) {
    return "Yesterday";
  } else {
    return format(date, formatString);
  }
}

export function formatMillis(millis: number, showSecs: boolean = false) {
  const hours = Math.floor(millis / 3600000);
  const minutes = Math.floor((millis % 3600000) / 60000);
  const seconds = Math.floor((millis % 60000) / 1000);

  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (showSecs && seconds > 0) {
    parts.push(`${seconds}s`);
  }
  if (parts.length === 0) {
    return showSecs ? "0s" : "0m";
  }

  return parts.join(" ");
}

export function calcCals(kilojoule?: number) {
  return kilojoule ? Math.round(kilojoule * 0.239006) : 0;
}
