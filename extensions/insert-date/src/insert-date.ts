import { getPreferenceValues, Clipboard } from "@raycast/api";
import { formatDate } from "./format-date";

export default async function Command() {
  const { dateFormat, customFormat } =
    getPreferenceValues<Preferences.InsertDate>();
  const fmt =
    dateFormat === "custom" ? customFormat || "YYYY-MM-DD" : dateFormat;
  await Clipboard.paste(formatDate(fmt));
}
