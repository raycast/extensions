export const EARLY_REMINDER_OPTIONS = [
  { label: "None", value: "" },
  { label: "5 minutes before", value: "300" },
  { label: "15 minutes before", value: "900" },
  { label: "30 minutes before", value: "1800" },
  { label: "1 hour before", value: "3600" },
  { label: "2 hours before", value: "7200" },
  { label: "1 day before", value: "86400" },
  { label: "2 days before", value: "172800" },
  { label: "1 week before", value: "604800" },
  { label: "1 month before", value: "2592000" },
] as const;

export function formatEarlyReminder(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const match = EARLY_REMINDER_OPTIONS.find((opt) => opt.value === String(Math.round(seconds)));
  if (match) return match.label;
  if (seconds < 3600) {
    const mins = Math.round(seconds / 60);
    return `${mins} minute${mins === 1 ? "" : "s"} before`;
  }
  if (seconds < 86400) {
    const hours = Math.round(seconds / 3600);
    return `${hours} hour${hours === 1 ? "" : "s"} before`;
  }
  const days = Math.round(seconds / 86400);
  return `${days} day${days === 1 ? "" : "s"} before`;
}

export function formatEarlyReminderShort(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "";
  if (seconds < 3600) {
    const mins = Math.round(seconds / 60);
    return `${mins}m before`;
  }
  if (seconds < 86400) {
    const hours = Math.round(seconds / 3600);
    return `${hours}h before`;
  }
  if (seconds < 604800) {
    const days = Math.round(seconds / 86400);
    return `${days}d before`;
  }
  if (seconds < 2592000) {
    const weeks = Math.round(seconds / 604800);
    return `${weeks}w before`;
  }
  const months = Math.round(seconds / 2592000);
  return `${months}mo before`;
}

const UNITS = "(?:minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|wks?|w|months?|mos?)";

export function extractEarlyReminderFromText(text: string): { title: string; earlyReminderSeconds: number | null } {
  const patterns = [
    new RegExp(
      `(?:remind|alert)\\s+me\\s+(?:at\\s+)?(\\d+)\\s*(${UNITS})\\b(?:\\s*(?:before|early|ahead|in\\s+advance))?(?:\\s*(?:reminder|alert))?`,
      "i",
    ),
    new RegExp(
      `(?:with|and)\\s+(\\d+)\\s*(${UNITS})\\b\\s*(?:before|early|ahead|in\\s+advance)(?:\\s*(?:reminder|alert))?`,
      "i",
    ),
    new RegExp(
      `(?:with|and)\\s+(?:an?\\s+)?early\\s+(?:reminder|alert)(?:\\s+(?:of|at|by|:))?\\s*(\\d+)\\s*(${UNITS})\\b`,
      "i",
    ),
    new RegExp(
      `early\\s+(?:reminder|alert)(?:\\s*:|\\s+of|\\s+at|\\s+by)?\\s+(\\d+)\\s*(${UNITS})\\b(?:\\s*(?:before|early|ahead|in\\s+advance))?`,
      "i",
    ),
    new RegExp(`(\\d+)\\s*(${UNITS})\\b\\s*early(?:\\s+(?:reminder|alert))?`, "i"),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      const amount = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      let seconds: number;
      if (unit.startsWith("m") && !unit.startsWith("mo")) {
        seconds = amount * 60;
      } else if (unit.startsWith("h")) {
        seconds = amount * 3600;
      } else if (unit.startsWith("d")) {
        seconds = amount * 86400;
      } else if (unit.startsWith("w")) {
        seconds = amount * 604800;
      } else if (unit.startsWith("mo")) {
        seconds = amount * 2592000;
      } else {
        continue;
      }

      const cleanTitle = `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`
        .replace(/\s+([,;.!?:])/g, "$1")
        .replace(/\s+/g, " ")
        .trim();

      return {
        title: cleanTitle,
        earlyReminderSeconds: seconds,
      };
    }
  }

  return {
    title: text.replace(/\s+/g, " ").trim(),
    earlyReminderSeconds: null,
  };
}
