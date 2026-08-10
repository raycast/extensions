import { getApplications, showToast, Toast, open } from "@raycast/api";
import dayjs from "dayjs";

export function getTimeStamp(value: string | Date, format: string): string {
  value = value || new Date();
  return dayjs(value).format(format);
}

export async function checkInstallation(showToastMessage: boolean) {
  const apps = await getApplications();
  const installed = apps.some(({ bundleId }) => bundleId === "pro.writer.mac");

  if (!installed) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "iA Writer is not installed",
      message: "Get iA Writer",
      primaryAction: {
        title: "Go to https://ia.net/writer",
        onAction: (toast) => {
          open("https://ia.net/writer");
          toast.hide();
        },
      },
    };

    if (showToastMessage) {
      await showToast(options);
    }
    return false;
  }
  return true;
}
