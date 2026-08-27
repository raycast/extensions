import { getApplications, open, showHUD, showToast, Toast } from "@raycast/api";

const bundleId = "com.dans.menucloak";
const downloadURL = "https://github.com/dans-huang/MenuCloak/releases/latest";

async function isInstalled(): Promise<boolean> {
  const applications = await getApplications();
  return applications.some((application) => application.bundleId === bundleId);
}

export async function runMenuCloakAction(action: string, confirmation: string): Promise<void> {
  if (!(await isInstalled())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "MenuCloak is not installed",
      message: "Install MenuCloak 1.9 or newer to use Raycast and Google Calendar.",
      primaryAction: {
        title: "Download MenuCloak",
        onAction: () => open(downloadURL),
      },
    });
    return;
  }

  await open(`menucloak://${action}`, bundleId);
  await showHUD(confirmation);
}
