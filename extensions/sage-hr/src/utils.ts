import { Employee } from "./types";

export function getEmployeeFullname(employee: Employee): string {
  return `${employee.first_name} ${employee.last_name}`;
}

function getStatusEmoji(policyName: string): string {
  if (policyName.toLowerCase().includes("sick")) {
    return "🤒";
  } else {
    return "";
  }
}

type SubtitleParams = {
  startDate: string;
  endDate: string;
  policyName: string;
};

export function getSubtitleText({ startDate, endDate, policyName }: SubtitleParams): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const emoji = getStatusEmoji(policyName);

  if (start.toDateString() === end.toDateString()) {
    const dateString = start.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
    return `${emoji} ${dateString}`;
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: start.getFullYear() !== end.getFullYear() ? "numeric" : undefined,
  };

  const localeStart = start.toLocaleDateString(undefined, formatOptions);
  const localeEnd = end.toLocaleDateString(undefined, formatOptions);

  const dateString = `${localeStart} - ${localeEnd}`;
  return `${emoji} ${dateString}`;
}
