import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";

function formatDate(date: Date, format: string): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  switch (format) {
    case "EU":
      return `${day}.${month}.${year}`;
    case "ISO":
      return `${year}-${month}-${day}`;
    case "US":
      return `${month}/${day}/${year}`;
    default:
      return `${day}.${month}.${year}`;
  }
}

function formatTime(date: Date, use24HourFormat: boolean): string {
  return date.toLocaleTimeString("default", {
    hour12: !use24HourFormat,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default async function main() {
  const preferences = getPreferenceValues();
  const use24HourFormat = preferences.use24HourFormat;
  const dateFormat = preferences.dateFormat;

  const now = new Date();
  const formattedDate = formatDate(now, dateFormat);
  const formattedTime = formatTime(now, use24HourFormat);
  const formattedDateTime = `${formattedDate} ${formattedTime}`;

  await Clipboard.copy(formattedDateTime);
  await showHUD(`📋 Date and time pasted: ${formattedDateTime}`);
  await Clipboard.paste(formattedDateTime);
}
