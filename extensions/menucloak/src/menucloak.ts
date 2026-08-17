import { getApplications, open, showHUD, showToast, Toast } from "@raycast/api";

const bundleId = "com.dans.menucloak";
const projectURL = "https://github.com/dans-huang/MenuCloak";

async function isInstalled(): Promise<boolean> {
  const applications = await getApplications();
  return applications.some((application) => application.bundleId === bundleId);
}

export async function runMenuCloakAction(action: string, confirmation: string): Promise<void> {
  if (!(await isInstalled())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "MenuCloak is not installed",
      message: "Install the native app before using this command.",
      primaryAction: {
        title: "View Installation Instructions",
        onAction: () => open(projectURL),
      },
    });
    return;
  }

  await open(`menucloak://${action}`, bundleId);
  await showHUD(confirmation);
}
