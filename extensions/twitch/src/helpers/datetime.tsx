export function formatDate(date: string) {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
}

export function getUpTime(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diff / 1000);
  const diffMinutes = Math.floor(diff / 60000);
  const diffHours = Math.floor(diff / 3600000);
  const diffDays = Math.floor(diff / 86400000);

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
