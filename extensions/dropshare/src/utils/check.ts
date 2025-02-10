import { getApplications, showToast, Toast, open } from "@raycast/api";

export async function isDropshareInstalled() {
  const applications = await getApplications();

  const validateBundleId = function (bundleId: string) {
    return ["net.mkswap.Dropshare5", "net.mkswap.Dropshare-setapp"].indexOf(bundleId) > -1;
  };

  return applications.some(({ bundleId }) => validateBundleId(bundleId ?? ""));
}

export async function checkDropshareInstallation() {
  if (!(await isDropshareInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Dropshare is not installed.",
      message: "Install it from dropshare.app or Setapp",
      primaryAction: {
        title: "Go to https://dropshare.app",
        onAction: (toast) => {
          open("https://dropshare.app");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
}
