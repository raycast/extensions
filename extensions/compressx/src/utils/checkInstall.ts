import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isCompressXInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "com.hieudinh.CompressX");
}

export async function checkCompressXInstallation(): Promise<boolean> {
  const isInstalled = await isCompressXInstalled();
  if (!isInstalled) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "CompressX is not installed.",
      message: "Install it from: https://hieudinh.com/compressx",
      primaryAction: {
        title: "Go to https://hieudinh.com/compressx",
        onAction: (toast) => {
          open("https://hieudinh.com/compressx");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
  return isInstalled;
}
