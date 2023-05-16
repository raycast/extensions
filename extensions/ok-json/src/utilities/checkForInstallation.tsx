import { getApplications, open, Alert, confirmAlert, popToRoot } from "@raycast/api";

async function isInstalled() {
  const applications = await getApplications();
  const result = applications.some(({ bundleId }) => bundleId === "net.shinystone.OKJSON");
  return result;
}

export default async function checkForInstallation() {
  const installed = await isInstalled();
  if (!installed) {
    const alertOptions: Alert.Options = {
      title: "OK JSON is not installed.",
      message: "Do you want to install it right now?",
      primaryAction: {
        title: "Install",
        onAction: async () => {
          open("https://apps.apple.com/app/ok-json-offline-private/id1576121509?mt=12");
          await popToRoot({ clearSearchBar: false });
        },
      },
      dismissAction: {
        title: "Cancel",
        onAction: async () => {
          await popToRoot({ clearSearchBar: false });
        },
      },
    };
    await confirmAlert(alertOptions);
    return Promise.resolve(false);
  } else {
    return Promise.resolve(true);
  }
}
