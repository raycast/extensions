import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isRectangleInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "com.knollsoft.Rectangle");
}

export async function checkRectangleInstallation() {
  if (!(await isRectangleInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Rectangle is not installed.",
      message: "You can download it from rectangleapp.com 😉",
      primaryAction: {
        title: "Open https://rectangleapp.com in default browser",
        onAction: (toast) => {
          open("https://rectangleapp.com");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
}
