import { getPreferenceValues, Clipboard } from "@raycast/api";
import { formatDate } from "./format-date";

interface Preferences {
  dateFormat: string;
  customFormat: string;
}

export default async function Command() {
  const { dateFormat, customFormat } = getPreferenceValues<Preferences>();
  const fmt = dateFormat === "custom" ? customFormat || "%Y-%m-%d" : dateFormat;
  await Clipboard.paste(formatDate(fmt));
}
