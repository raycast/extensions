import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isZipicInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "studio.5km.zipic");
}

export async function checkZipicInstallation(): Promise<boolean> {
  const isInstalled = await isZipicInstalled();
  if (!isInstalled) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Zipic is not installed.",
      message: "Install it from: https://zipic.5km.tech",
      primaryAction: {
        title: "Go to https://zipic.5km.tech",
        onAction: (toast) => {
          open("https://zipic.5km.tech");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
  return isInstalled;
}
