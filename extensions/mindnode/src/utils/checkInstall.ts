import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isMindNodeInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "com.ideasoncanvas.mindnode.macos");
}

export async function checkMindnodeInstallation(): Promise<boolean> {
  const isInstalled = await isMindNodeInstalled();
  if (!isInstalled) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "MindNode is not installed.",
      message: "Install it from: https://mindnode.com",
      primaryAction: {
        title: "Go to https://mindnode.com",
        onAction: (toast) => {
          open("https://mindnode.com");
          toast.hide();
        },
      },
      secondaryAction: {
        title: "Go to App Store",
        onAction: (toast) => {
          open("https://apps.apple.com/app/apple-store/id1289197285?pt=14265&ct=web-main&mt=8");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
  return isInstalled;
}