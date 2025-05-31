export function convertTo12Hour(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour24 = parseInt(hours);
  const min = minutes;

  if (hour24 === 0) {
    return `12:${min} AM`;
  } else if (hour24 < 12) {
    return `${hour24}:${min} AM`;
  } else if (hour24 === 12) {
    return `12:${min} PM`;
  } else {
    return `${hour24 - 12}:${min} PM`;
  }
}

export function convertTo24Hour(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour24 = parseInt(hours);
  const min = minutes;
  return `${hour24.toString().padStart(2, "0")}:${min}`;
}

export function formatTime(time: string, hoursSystem: "12" | "24"): string {
  if (hoursSystem === "24") {
    return convertTo24Hour(time);
  }
  if (hoursSystem === "12") {
    return convertTo12Hour(time);
  }
  return time;
}
