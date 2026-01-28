export function formatDate(date: string | number, options: Intl.DateTimeFormatOptions = {}) {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    weekday: "weekday" in options ? options.weekday : "long",
    hour: "hour" in options ? options.hour : "numeric",
    minute: "minute" in options ? options.minute : "numeric",
    second: "second" in options ? options.second : "numeric",
  });
}

export function formatLongAgo(date: string | number) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  // less than a week
  if (diff < 604800000) {
    return d.toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "numeric" });
  } else if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleString("en-US", { month: "long", day: "numeric", weekday: "long" });
  } else {
    return d.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
}

function formatDuration(duration: number) {
  const diffSeconds = Math.floor(duration / 1000);
  const diffMinutes = Math.floor(duration / 60000);
  const diffHours = Math.floor(duration / 3600000);
  const diffDays = Math.floor(duration / 86400000);

  if (diffSeconds < 60) {
    return `${diffSeconds} seconds`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minutes and ${diffSeconds - diffMinutes * 60} seconds`;
  } else if (diffHours < 24) {
    return `${diffHours} hours and ${diffMinutes - diffHours * 60} minutes`;
  } else {
    return `${diffDays} days`;
  }
}

export function formatISODuration(duration: string) {
  const matches = duration.match(/^([0-9]+d)?([0-9]+h)?([0-9]+m)?([0-9]+s)?$/);
  if (!matches) return "0 seconds";

  const days = matches[1] ? parseInt(matches[1]) : 0;
  const hours = matches[2] ? parseInt(matches[2]) : 0;
  const minutes = matches[3] ? parseInt(matches[3]) : 0;
  const seconds = matches[4] ? parseInt(matches[4]) : 0;

  const milliseconds = (days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds) * 1000;

  return formatDuration(milliseconds);
}

export function getUpTime(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return formatDuration(diff);
}
