export function parseTime(rule: "start" | "end", time: string): string {
  const formattedTime = time.split(" ")[0].slice(0, 5);
  const hour = formattedTime.slice(0, 2);
  const minutes = formattedTime.slice(2, 5);

  if (Number(hour) <= 12) return stripZero(formattedTime) + (rule == "start" ? "" : " am");

  const formattedHour = (Number(hour) - 12).toString();
  const twelveHourFormat = formattedHour + minutes;

  return twelveHourFormat + (rule == "end" ? " pm" : "");
}

export function currentlyActive(): boolean {
  return true;
}

function stripZero(time: string): string {
  if (time.charAt(0) == "0") {
    return time.slice(1, 5);
  }
  return time;
}
