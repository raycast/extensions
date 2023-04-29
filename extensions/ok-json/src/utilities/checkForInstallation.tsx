import { getApplications, Toast, open, showToast, environment } from "@raycast/api";

async function isInstalled() {
  const applications = await getApplications();
  if (environment.isDevelopment) {
    return true;
  }
  return applications.some(({ bundleId }) => bundleId === "net.shinystone.OKJSON");
}

export default async function checkForInstallation() {
  const installed = await isInstalled();
  if (!installed) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "OK JSON is not installed.",
      message: "Install it from here.",
      primaryAction: {
        title: "Download OK JSON on Mac App Store",
        onAction: (toast) => {
          open("https://apps.apple.com/app/ok-json-offline-private/id1576121509?mt=12");
          toast.hide();
        },
      },
      secondaryAction: {
        title: "Download OK JSON on the Offical Website",
        onAction(toast) {
          open("https://okjson.app");
          toast.hide();
        },
      },
    };
    await showToast(options);
    return Promise.reject(false);
  } else {
    return Promise.resolve(true);
  }
}
