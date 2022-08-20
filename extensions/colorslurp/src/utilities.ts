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
      message: "You can download it from the website or the app store",
      primaryAction: { title: "Open Website", onAction: () => open("https://colorslurp.com?utm_source=raycast") },
      secondaryAction: {
        title: "Open App Store",
        onAction: () => open("https://apps.apple.com/us/app/colorslurp/id1287239339#?platform=mac"),
      },
    });

    return;
  } else {
    await closeMainWindow();
    await open(url);
  }
}
