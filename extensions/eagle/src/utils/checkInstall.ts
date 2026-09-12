import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isEagleInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "tw.ogdesign.eagle");
}

export async function checkEagleInstallation() {
  if (!(await isEagleInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Eagle is not installed.",
      message: "Install it from: https://eagle.cool",
      primaryAction: {
        title: "Go to https://eagle.cool",
        onAction: (toast) => {
          open("https://eagle.cool");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
}
