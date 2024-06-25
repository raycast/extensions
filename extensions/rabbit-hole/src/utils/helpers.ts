export function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  };

  return date.toLocaleString('en-US', options);
}

export function timeAgo(timestamp: Date): string {
const now = new Date();
const date = new Date(timestamp);
const secondsPast = (now.getTime() - date.getTime()) / 1000;

  if (secondsPast < 60) {
    return `${Math.floor(secondsPast)}secs ago`;
  }

  const minutesPast = secondsPast / 60;
  if (minutesPast < 60) {
    return `${Math.floor(minutesPast)}mins ago`;
  }

  const hoursPast = minutesPast / 60;
  if (hoursPast < 24) {
    return `${Math.floor(hoursPast)}h ago`;
  }

  const daysPast = hoursPast / 24;
  if (daysPast < 7) {
    return `${Math.floor(daysPast)}d ago`;
  }

  const weeksPast = daysPast / 7;
  if (weeksPast < 4.3) {
    return `${Math.floor(weeksPast)}w ago`;
  }

  const monthsPast = daysPast / 30;
  if (monthsPast < 12) {
    return `${Math.floor(monthsPast)}m ago`;
  }

  const yearsPast = monthsPast / 12;
  return `${Math.floor(yearsPast)}y ago`;
}
  