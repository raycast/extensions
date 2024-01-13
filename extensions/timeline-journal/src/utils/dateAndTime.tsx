import { getPreferenceValues } from "@raycast/api";

export function dateFormat() {
  const preferences = getPreferenceValues<Preferences>();

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  const dateFormatMappings = {
    "DD-MM-YYYY": `${day}-${month}-${year}`,
    "MM-DD-YYYY": `${month}-${day}-${year}`,
    YYYYMMDD: `${year}${month}${day}`,
    DDMMYYYY: `${day}${month}${year}`,
    MMDDYYYY: `${month}${day}${year}`,
  };

  const formattedDate =
    dateFormatMappings[preferences.dateFormat as keyof typeof dateFormatMappings] || `${year}-${month}-${day}`;

  return formattedDate;
}

export function timeFormat() {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.timeFormat === "12h") {
    return new Date().toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
  }
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}
