import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isTomitoInstalled() {
  const installedApps = await getApplications();
  return installedApps.some((app) => app.bundleId === "com.tomito.tomito");
}

export async function checkTomitoInstallation() {
  const isInstalled = await isTomitoInstalled();

  if (!isInstalled) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Tomito is not installed.",
      message: "Install it at: https://tomito.app/",
      primaryAction: {
        title: "Go to: https://tomito.app",
        onAction: (toast) => {
          open("https://tomito.app");
          toast.hide();
        },
      },
    };
    await showToast(options);
  }
  return isInstalled;
}
