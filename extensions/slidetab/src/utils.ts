import { getApplications, open, showHUD, showToast, Toast } from "@raycast/api";

const BUNDLE_ID = "com.slidetab.macos";
const DOWNLOAD_URL = "https://slidetab.app";

export type SlideTabRoute =
  | "toggle"
  | "enable"
  | "disable"
  | "pause"
  | "preview"
  | "settings"
  | "settings/trackpad"
  | "settings/switching"
  | "settings/shortcuts"
  | "settings/about"
  | "mode/all-windows"
  | "mode/apps-only"
  | "mode/active-app"
  | "layout/icons"
  | "layout/list"
  | "layout/toggle"
  | "fingers/auto"
  | "fingers/3"
  | "fingers/4"
  | "fingers/top-edge"
  | "style/hold"
  | "style/instant"
  | "style/top-edge"
  | "toggle-game-pause"
  | "pause-current-app";

export async function isSlideTabInstalled(): Promise<boolean> {
  const apps = await getApplications();
  return apps.some((app) => app.bundleId === BUNDLE_ID);
}

export async function runSlideTabCommand(path: SlideTabRoute, hudMessage?: string): Promise<boolean> {
  const installed = await isSlideTabInstalled();
  if (!installed) {
    await showToast({
      style: Toast.Style.Failure,
      title: "SlideTab.app is not installed",
      message: "Install SlideTab in /Applications to use trackpad window switching.",
      primaryAction: {
        title: "Get SlideTab",
        onAction: () => open(DOWNLOAD_URL),
      },
    });
    return false;
  }

  try {
    await open(`slidetab://${path}`, BUNDLE_ID);
    if (hudMessage) {
      await showHUD(hudMessage);
    }
    return true;
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not communicate with SlideTab",
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
