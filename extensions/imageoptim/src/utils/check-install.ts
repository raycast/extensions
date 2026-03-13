import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isImageOptimInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "net.pornel.ImageOptim");
}

export async function checkImageOptimInstallation(): Promise<boolean> {
  const isInstalled = await isImageOptimInstalled();
  if (!isInstalled) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "ImageOptim is not installed.",
      message: "Install it from: https://imageoptim.com/mac",
      primaryAction: {
        title: "Go to https://imageoptim.com/mac",
        onAction: (toast) => {
          open("https://imageoptim.com/mac");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
  return isInstalled;
}
