import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isBobInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "com.ripperhe.Bob" || bundleId === "com.hezongyidev.Bob");
}

export async function checkBobInstallation() {
  if (!(await isBobInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Bob is not installed.",
      message: "Install it from: https://bobtranslate.com/",
      primaryAction: {
        title: "Go to https://bobtranslate.com/",
        onAction: (toast) => {
          open("https://bobtranslate.com/");
          toast.hide();
        },
      },
    };

    // await showHUD("Bob is not installed!");
    await showToast(options);
    return false;
  }

  return true;
}
