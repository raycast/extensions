import { getApplications, open, showHUD, Toast, showToast } from "@raycast/api";

const MONOCLE_DOWNLOAD_URL = "https://www.heyiam.dk/monocle";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function monocle(path: string, message: string) {
  const url = `monocle://${path}`;

  // First attempt: try the deep link directly.
  try {
    await open(url);
    await showHUD(message);
    return;
  } catch {
    // Fall through to try to launch the app and retry.
  }

  const apps = await getApplications();
  const monocleApp = apps.find((app) => app.name.toLowerCase() === "monocle" || app.path.endsWith("/Monocle.app"));

  if (!monocleApp) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Monocle isn’t installed",
      message: "Install Monocle to control it from Raycast.",
      primaryAction: {
        title: "Open download page",
        onAction: async () => {
          await open(MONOCLE_DOWNLOAD_URL);
        },
      },
    });
    return;
  }

  // Launch the app, then retry the deep link once.
  await open(monocleApp.path);
  await delay(500);

  try {
    await open(url);
    await showHUD(message);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn’t reach Monocle",
      message: "Monocle is installed but didn’t respond to the command.",
    });
  }
}
