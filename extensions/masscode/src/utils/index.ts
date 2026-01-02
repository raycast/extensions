import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isMassCodeInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "io.masscode.app");
}

export async function checkMassCodeInstallation() {
  if (!(await isMassCodeInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "massCode is not installed.",
      message: "Install it from: https://masscode.io",
      primaryAction: {
        title: "Go to https://masscode.io",
        onAction: (toast) => {
          open("https://masscode.io");
          toast.hide();
        },
      },
    };

    await showToast(options);
    return false;
  }
  return true;
}
