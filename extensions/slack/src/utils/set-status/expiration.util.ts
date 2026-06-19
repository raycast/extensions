function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isTomorrowOrAlmostTomorrow(date: Date): boolean {
  const datePlusOneMinute = new Date(date.getTime() + 60 * 1000);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return isSameDay(datePlusOneMinute, tomorrow);
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function formatExpirationDate(date: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const day = date.getDate();

  const s = ["th", "st", "nd", "rd"];
  const v = day % 100;
  const dayWithOrdinal = day + (s[(v - 20) % 10] || s[v] || s[0]);

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${dayName}, ${monthName} ${dayWithOrdinal}, ${hours}:${minutes}`;
}

function pluralizeWord(word: string, count: number): string {
  return `${count} ${count === 1 ? word : word + "s"}`;
}

export function getTextForExpiration(expirationTimestamp: number): string | undefined {
  const now = new Date();
  const expirationDate = new Date(expirationTimestamp * 1000);

  if (now.getTime() > expirationDate.getTime()) {
    return undefined;
  }

  const isTomorrow = isTomorrowOrAlmostTomorrow(expirationDate);

  if (isTomorrow) {
    return "Until tomorrow";
  } else if (!isToday(expirationDate)) {
    return `Until ${formatExpirationDate(expirationDate)}`;
  }

  const durationInSeconds = Math.floor((expirationDate.getTime() - now.getTime()) / 1000);
  const durationInHours = Math.floor(durationInSeconds / 3600);
  const durationInMinutes = Math.floor((durationInSeconds % 3600) / 60);

  let relativeDuration;

  if (durationInHours > 0 && durationInMinutes > 0) {
    relativeDuration = `${durationInHours}h ${durationInMinutes}m`;
  } else if (durationInHours > 0) {
    relativeDuration = pluralizeWord("hour", durationInHours);
  } else if (durationInMinutes > 0) {
    relativeDuration = pluralizeWord("minute", durationInMinutes);
  } else {
    relativeDuration = "a minute";
  }

  return `Clears in ${relativeDuration}`;
}

export function getExpirationTimestamp(value: string): number {
  if (value === "custom") {
    throw new Error("error: 'custom' value must use a separate DatePicker state.");
  }

  const now = new Date();

  switch (value) {
    case "0":
      return 0;
    case "today":
      now.setHours(23, 59, 59, 0);
      return Math.floor(now.getTime() / 1000);
    case "week": {
      const dayOfWeek = now.getDay();

      const daysUntilFriday = (5 - dayOfWeek + 7) % 7;

      now.setDate(now.getDate() + daysUntilFriday);
      now.setHours(23, 59, 59, 0);

      return Math.floor(now.getTime() / 1000);
    }
    default: {
      const minutes = parseInt(value, 10);

      if (isNaN(minutes)) {
        return 0;
      }

      return Math.floor(now.getTime() / 1000) + minutes * 60;
    }
  }
}

export function getDurationOptionFromTimestamp(expirationTimestamp: number): string {
  if (expirationTimestamp === 0) {
    return "0";
  }

  const todayTimestamp = getExpirationTimestamp("today");
  const weekTimestamp = getExpirationTimestamp("week");

  if (expirationTimestamp === todayTimestamp) {
    return "today";
  }

  if (expirationTimestamp === weekTimestamp) {
    return "week";
  }

  return "custom";
}
