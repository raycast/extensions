import { Clipboard, environment, getPreferenceValues, LaunchType, Toast, updateCommandMetadata } from "@raycast/api";
import strftime from "strftime";
import { getZoneOffsetMinutes } from "./timezone";

const command = async () => {
  const prefs = getPreferenceValues<Preferences.ShowDate>();
  const now = new Date();
  const formatted = strftime.timezone(getZoneOffsetMinutes(now, prefs.ianaTimezone))(
    prefs.dateFormat || "%A, %B %d, %Y",
    now,
  );

  await updateCommandMetadata({ subtitle: `${formatted} · Press enter to copy` });

  if (environment.launchType === LaunchType.UserInitiated) {
    await Clipboard.copy(formatted);
    const unsupported = [...new Set(formatted.match(/%[-_0]?[A-Za-z]/g) ?? [])];
    const hasUnsupported = unsupported.length > 0;
    await new Toast({
      style: hasUnsupported ? Toast.Style.Failure : Toast.Style.Success,
      title: hasUnsupported ? "Copied with Unsupported Tokens" : "Copied to Clipboard",
      message: hasUnsupported ? `Unsupported tokens: ${unsupported.join(", ")} — ${formatted}` : formatted,
    }).show();
  }
};

export default command;
