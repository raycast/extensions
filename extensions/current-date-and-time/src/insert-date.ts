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

export default async function main() {
  const preferences = getPreferenceValues();
  const dateFormat = ["EU", "ISO", "US"].includes(preferences.dateFormat) ? preferences.dateFormat : "EU";

  const now = new Date();
  const formattedDate = formatDate(now, dateFormat);

  try {
    await Clipboard.copy(formattedDate);
    await showHUD(`📋 ${formattedDate}`);
    await Clipboard.paste(formattedDate);
  } catch (error) {
    await showHUD("Failed to copy/paste!");
  }
}
