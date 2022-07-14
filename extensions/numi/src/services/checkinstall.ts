import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isNumiInstalled() {
  const applications = await getApplications();
  return applications.some(
    ({ bundleId }) =>
      bundleId === "com.dmitrynikolaev.numi" ||
      bundleId === "com.nikolaeu.numi-setapp" ||
      bundleId === "com.nikolaeu.numi"
  );
}

export async function checkNumiInstallation() {
  if (!(await isNumiInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Numi is not installed.",
      message: "Install it from: https://numi.app/",
      primaryAction: {
        title: "Go to https://numi.app/",
        onAction: (toast) => {
          open("https://numi.app/");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
}
