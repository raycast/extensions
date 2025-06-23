// this code is entirely copied from the google calendar extension and i made absolutely none of it. 
export function toHumanReadableTime(date = new Date()) {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

export function toISO8601WithTimezoneOffset(date = new Date()) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
  
    const offset = date.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offset / 60))
      .toString()
      .padStart(2, "0");
    const offsetMinutes = Math.abs(offset % 60)
      .toString()
      .padStart(2, "0");
    const offsetSign = offset <= 0 ? "+" : "-";
  
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
  }