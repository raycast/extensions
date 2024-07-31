import { getApplications, showToast, Toast, open } from "@raycast/api";

export type DetectedInstallation = "rectangle" | "rectangle-pro" | "none";

async function detectInstallation(): Promise<DetectedInstallation> {
  const applications = await getApplications();
  if (applications.some(({ bundleId }) => bundleId === "com.knollsoft.Hookshot")) {
    return "rectangle-pro";
  } else if (applications.some(({ bundleId }) => bundleId === "com.knollsoft.Rectangle")) {
    return "rectangle";
  }
  return "none";
}

/**
 * Ensures that Rectangle is installed.
 *
 * If Rectangle is not installed, displays a toast notification prompting the user to download it from rectangleapp.com.
 *
 * @returns {DetectedInstallation} Which version of Rectangle (if any) is installed.
 */
export async function ensureRectangleIsInstalled(): Promise<DetectedInstallation> {
  const detectedInstallation = await detectInstallation();
  if (detectedInstallation === "none") {
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
  return detectedInstallation;
}
