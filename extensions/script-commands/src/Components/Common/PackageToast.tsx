import { Toast, ToastStyle, showToast } from "@raycast/api";

import { Progress } from "@types";

export async function PackageToast(progress: Progress, packageName = "", message = ""): Promise<Toast> {
  let title = "";
  let style = ToastStyle.Animated;

  switch (progress) {
    case Progress.InProgress:
      {
        title = `Installing package '${packageName}'...`;
        style = ToastStyle.Animated;
      }
      break;

    case Progress.Finished:
      {
        title = `Package '${packageName}' installed!`;
        style = ToastStyle.Success;
      }
      break;
  }

  return showToast(style, title, message);
}
