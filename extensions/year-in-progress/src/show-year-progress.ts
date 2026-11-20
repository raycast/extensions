import { environment, LaunchType, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { getSubtitle, getYearProgressNum } from "./utils/progress";

export default async function Command() {
  const subtitle = getSubtitle(getYearProgressNum());
  await updateCommandMetadata({ subtitle });

  if (environment.launchType === LaunchType.UserInitiated) {
    await showToast({ style: Toast.Style.Success, title: "Year in Progress", message: subtitle });
  }
}
