import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isRectangleInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "com.knollsoft.Rectangle");
}

/**
 * Ensures that Rectangle is installed.
 *
 * If Rectangle is not installed, displays a toast notification prompting the user to download it from rectangleapp.com.
 *
 * @returns {boolean} Whether Rectangle installation was detected.
 */
export async function ensureRectangleIsInstalled(): Promise<boolean> {
  const isInstalled = await isRectangleInstalled();
  if (!isInstalled) {
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
  return isInstalled;
}
