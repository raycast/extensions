import { getApplications, open, showToast, Toast } from "@raycast/api";

export async function isRetraceInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "io.retrace.app");
}

export async function checkRetraceInstallation(): Promise<boolean> {
  const installed = await isRetraceInstalled();
  if (!installed) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Retrace is not installed",
      message: "Install it from: https://retrace.to",
      primaryAction: {
        title: "Go to https://retrace.to",
        onAction: (toast) => {
          open("https://retrace.to");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
  return installed;
}
