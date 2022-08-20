import { getApplications, showToast, Toast, open, closeMainWindow } from "@raycast/api";

async function isColorSlurpInstalled() {
  const applications = await getApplications();

  return applications.some(({ bundleId }) => {
    return bundleId === "com.IdeaPunch.ColorSlurp";
  });
}

export async function openColorSlurpUrl(url: string) {
  if (!(await isColorSlurpInstalled())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "ColorSlurp isn't installed",
      message: "Install it from: https://colorslurp.com",
    });

    return;
  } else {
    await closeMainWindow();
    await open(url);
  }
}
