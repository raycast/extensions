import { getApplications, showToast, Toast, open, popToRoot, showHUD } from "@raycast/api";

async function isMassCodeInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "io.masscode.app");
}

export async function massCodeInstallationCheck() {
  if (!(await isMassCodeInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "massCode is not installed",
      message: "Download from https://masscode.io",
      primaryAction: {
        title: "Download massCode",
        onAction: (toast) => {
          open("https://masscode.io");
          toast.hide();
        },
      },
    };

    await showToast(options);
  } else {
    popToRoot();
    open("open", "io.masscode.app");
    showHUD("Opened massCode, run the command again");
  }
}
