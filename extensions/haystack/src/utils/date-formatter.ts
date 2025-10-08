import { DATE_FORMATS } from "../constants";

const MONTH_NAMES = [
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

/**
 * Formats a date string with handling of partial dates
 * Expects: YYYY-MM-DD, YYYY-MM, or MM-DD
 */
export const formatDate = (dateString: string): string => {
  try {
    const trimmed = dateString.trim();
    const parts = trimmed.split("-");

    if (parts.length === 3) {
      // YYYY-MM-DD
      const [year, month, day] = parts;
      const date = new Date(`${year}-${month}-${day}`);
      return date.toLocaleDateString("en-US", DATE_FORMATS.DISPLAY);
    }

    if (parts.length === 2) {
      const first = parseInt(parts[0], 10);

      if (first > 31) {
        // YYYY-MM
        const year = first;
        const month = parseInt(parts[1], 10) - 1;
        return `${MONTH_NAMES[month]} ${year}`;
      } else {
        // MM-DD
        const month = first - 1;
        const day = parseInt(parts[1], 10);
        return `${MONTH_NAMES[month]} ${day}`;
      }
    }

    return dateString;
  } catch {
    return dateString;
  }
};

/**
 * Formats a time string
 * Expects: HH:MM (24-hour format)
 */
export const formatTime = (timeString: string): string => {
  try {
    const trimmed = timeString.trim();
    const parts = trimmed.split(":");

    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);

      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;

      return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
    }

    return timeString;
  } catch {
    return timeString;
  }
};

export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};
