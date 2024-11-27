import { getPreferenceValues, Clipboard, closeMainWindow } from "@raycast/api";
import dayjs from "dayjs";

interface Preferences {
  nowTimeFormat: string;
}

export default async () => {
  const preferences = getPreferenceValues<Preferences>();
  const format = preferences.nowTimeFormat || "YYYY-MM-DD";
  const now = dayjs(new Date()).format(format);
  await Clipboard.paste(now);
  await closeMainWindow({ clearRootSearch: true });
};
