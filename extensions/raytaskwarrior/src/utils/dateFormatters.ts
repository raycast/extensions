function parseDate(timestamp: string): Date {
  const year = timestamp.substring(0, 4);
  const month = timestamp.substring(4, 6);
  const day = timestamp.substring(6, 8);
  const hours = timestamp.substring(9, 11);
  const minutes = timestamp.substring(11, 13);
  const seconds = timestamp.substring(13, 15);
  const iso8601Timestamp = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;

  return new Date(iso8601Timestamp);
}

export const formatDate = (date: string) => {
  const dateObject = parseDate(date);

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isYesterday = (date: Date): boolean => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    );
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    return `${((hours + 11) % 12) + 1}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  if (isToday(dateObject)) {
    return `Today at ${formatTime(dateObject)}`;
  } else if (isYesterday(dateObject)) {
    return `Yesterday at ${formatTime(dateObject)}`;
  } else {
    return dateObject.toLocaleDateString() + " at " + formatTime(dateObject);
  }
};

export const getActiveTime = (timestamp: string): string => {
  const dateObject = parseDate(timestamp);
  const now = new Date();
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;

  const elapsed = now.getTime() - dateObject.getTime();

  if (elapsed < msPerMinute) {
    const seconds = Math.round(elapsed / 1000);
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  } else if (elapsed < msPerHour) {
    const minutes = Math.round(elapsed / msPerMinute);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  } else if (elapsed < msPerDay) {
    const hours = Math.round(elapsed / msPerHour);
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  } else if (elapsed < msPerMonth) {
    const days = Math.round(elapsed / msPerDay);
    return `${days} day${days !== 1 ? "s" : ""}`;
  } else if (elapsed < msPerYear) {
    const months = Math.round(elapsed / msPerMonth);
    return `${months} month${months !== 1 ? "s" : ""}`;
  } else {
    const years = Math.round(elapsed / msPerYear);
    return `${years} year${years !== 1 ? "s" : ""}`;
  }
};

export const formatDueDate = (dueDate: string): string => {
  const dueDateObject = parseDate(dueDate);

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isTomorrow = (date: Date): boolean => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
    );
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    return `${((hours + 11) % 12) + 1}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  if (isToday(dueDateObject)) {
    return `Today at ${formatTime(dueDateObject)}`;
  } else if (isTomorrow(dueDateObject)) {
    return `Tomorrow at ${formatTime(dueDateObject)}`;
  } else {
    return `${dueDateObject.toLocaleDateString()} at ${formatTime(dueDateObject)}`;
  }
};
