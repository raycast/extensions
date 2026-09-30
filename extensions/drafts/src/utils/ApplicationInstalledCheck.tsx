import { getApplications, showToast, Toast, open } from "@raycast/api";
import { AppInstallCheckDefines } from "./Defines";

async function isAppInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === AppInstallCheckDefines.APP_BUNDLE_ID);
}

export async function checkAppInstallation(): Promise<boolean> {
  if (!(await isAppInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: AppInstallCheckDefines.APP_NAME + " is not installed.",
      message: "Install it from: " + AppInstallCheckDefines.APP_DOWNLOAD_LINK,
      primaryAction: {
        title: "Open " + AppInstallCheckDefines.APP_DOWNLOAD_LINK,
        onAction: (toast) => {
          open(AppInstallCheckDefines.APP_DOWNLOAD_LINK);
          toast.hide();
        },
      },
    };

    await showToast(options);
    return false;
  }
  return true;
}
