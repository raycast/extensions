import { getApplications, showToast, Toast, open } from "@raycast/api";

export const SUPERWHISPER_BUNDLE_ID = "com.superduper.superwhisper";
export const SUPERWHISPER_SETAPP_BUNDLE_ID = "com.superduper.superwhisper-setapp";

export async function isSuperwhisperInstalled() {
  const applications = await getApplications();
  const bundleFound = applications.some(
    ({ bundleId }) => bundleId === SUPERWHISPER_BUNDLE_ID || bundleId === SUPERWHISPER_SETAPP_BUNDLE_ID,
  );
  return bundleFound;
}

export async function checkSuperwhisperInstallation() {
  const isInstalled = await isSuperwhisperInstalled();
  if (!isInstalled) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Superwhisper is not installed.",
      message: "Install from superwhisper.com",
      primaryAction: {
        title: "Go to superwhisper.com",
        onAction: async (toast) => {
          await open("https://superwhisper.com");
          await toast.hide();
        },
      },
    };

    await showToast(options);
  }
  return isInstalled;
}
