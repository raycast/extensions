export function parseISODate(dateStr: string): Date {
  return new Date(dateStr);
}

export function getDaysDifference(date1: Date, date2: Date): number {
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

  return Math.floor((utc2 - utc1) / 86400000);
}

export function formatShortDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatLongDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString(undefined, options);
}

export function nextWeekDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  return nextWeek;
}

export function getTimeRemaining(dueDateStr: string): string {
  const dueDate = parseISODate(dueDateStr);
  const today = new Date();
  const daysLeft = getDaysDifference(today, dueDate);

  if (daysLeft < 0) {
    return "Overdue";
  } else if (daysLeft === 0) {
    return "Due today";
  } else if (daysLeft === 1) {
    return "1 day left";
  } else if (daysLeft <= 30) {
    return `${daysLeft} days left`;
  } else {
    return formatShortDate(dueDate);
  }
}
