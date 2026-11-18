import { getApplications, showToast, Toast, open } from "@raycast/api";

const PROXYMAN_BUNDLE_IDS = ["com.proxyman.NSProxy", "com.proxyman.NSProxy-setapp"];

async function isProxymanAppInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId !== undefined && PROXYMAN_BUNDLE_IDS.includes(bundleId));
}

// Return the actual install path of Proxyman (e.g. /Applications/Proxyman.app or, for Setapp
// users, /Applications/Setapp/Proxyman.app) so callers never hardcode the bundle location.
export async function getProxymanAppPath(): Promise<string | undefined> {
  const applications = await getApplications();
  const app = applications.find(({ bundleId }) => bundleId !== undefined && PROXYMAN_BUNDLE_IDS.includes(bundleId));
  return app?.path;
}

export async function checkProxymanAppInstallation(): Promise<boolean> {
  const isInstalled = await isProxymanAppInstalled();
  if (!isInstalled) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Proxyman is not installed.",
      message: "Download it from Proxyman Website",
      primaryAction: {
        title: "Go to https://proxyman.io/",
        onAction: (toast) => {
          open("https://proxyman.io/");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
  return isInstalled;
}
