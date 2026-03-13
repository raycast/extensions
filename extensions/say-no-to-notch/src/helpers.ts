import { getApplications, open, Alert, confirmAlert } from "@raycast/api";

const bundleId = "com.ibluebox.say-no-to-notch";

export async function isAppInstalled() {
  const applications = await getApplications();
  return applications.some((app) => app.bundleId === bundleId);
}

export async function promptToInstall() {
  const options: Alert.Options = {
    title: '"Say No to Notch" is not installed',
    message: "Do you want to install Say No to Notch?",
    primaryAction: {
      title: "Install",
      style: Alert.ActionStyle.Default,
      onAction: async () => {
        open("https://apps.apple.com/app/say-no-to-notch/id1639306886");
      },
    },
    dismissAction: {
      title: "Cancel",
    },
  };
  await confirmAlert(options);
}
