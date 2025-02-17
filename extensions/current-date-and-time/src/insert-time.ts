import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";

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

  const now = new Date();
  const formattedTime = formatTime(now, use24HourFormat);

  try {
    await Clipboard.copy(formattedTime);
    await showHUD(`📋 Time copied: ${formattedTime}`);
    await Clipboard.paste(formattedTime);
  } catch (error) {
    await showHUD('Failed to copy/paste time');
  }
}
