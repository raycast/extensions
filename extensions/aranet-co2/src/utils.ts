import { Toast, getApplications, open, showToast } from "@raycast/api";

export async function showClaranet4Error() {
  await showToast({
    style: Toast.Style.Failure,
    title: "claranet4 is not installed.",
    message: "Install it from https://github.com/bede/claranet4",
    primaryAction: {
      title: "Go to https://github.com/bede/claranet4",
      onAction: (toast) => {
        open("https://github.com/bede/claranet4?tab=readme-ov-file#install");
        toast.hide();
      },
    },
  });
}

async function isAranetHomeAppInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "com.saf.aranetCube");
}

export async function checkAranetHomeInstallation() {
  if (!(await isAranetHomeAppInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Aranet Home is not installed.",
      message: "Install it from the App Store",
      primaryAction: {
        title: "Open App Store",
        onAction: (toast) => {
          open("https://apps.apple.com/lv/app/aranet-home/id1392378465");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
}
