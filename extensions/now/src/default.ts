import { getPreferenceValues, Clipboard, closeMainWindow } from "@raycast/api";
import dayjs from "dayjs";

export default async () => {
  const now = new Date();
  const preferences = getPreferenceValues<Preferences>();
  const format = preferences.default || "YYYY-MM-DD";
  await Clipboard.paste(dayjs(now).format(format));
  await closeMainWindow({ clearRootSearch: true });
};
