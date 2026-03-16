import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import { type ClockPreferences, formatSubtitle } from "./clock-format";

export default async function Command() {
  const preferences = getPreferenceValues<ClockPreferences>();
  const subtitle = formatSubtitle(new Date(), preferences);
  await updateCommandMetadata({ subtitle });
}
