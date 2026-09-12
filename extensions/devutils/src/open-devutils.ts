import { getApplications, open, showToast, Toast } from "@raycast/api";

const DEVUTILS_BUNDLE_ID = "tonyapp.devutils";
const DEVUTILS_APP_NAME = "DevUtils";
const DEVUTILS_DOWNLOAD_URL = "https://devutils.com";

export async function openDevUtilsTool(tool: string) {
  const app = (await getApplications()).find(
    (app) => app.bundleId === DEVUTILS_BUNDLE_ID || app.name === DEVUTILS_APP_NAME
  );

  if (!app) {
    await showToast({
      style: Toast.Style.Failure,
      title: "DevUtils is not installed",
      message: "Install the DevUtils app to use these commands.",
      primaryAction: {
        title: "Download App",
        onAction: async (toast) => {
          await open(DEVUTILS_DOWNLOAD_URL);
          await toast.hide();
        },
      },
    });
    return;
  }

  await open(`devutils://${tool}?clipboard`);
}
