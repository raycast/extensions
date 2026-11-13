import { getApplications } from "@raycast/api";

// Launch and install hand a steam:// URL to the Steam app, so without it they would quietly do nothing
export async function ensureSteamInstalled() {
  const apps = await getApplications();
  if (!apps.some((app) => app.bundleId === "com.valvesoftware.steam" || /^steam$/i.test(app.name))) {
    throw new Error("Steam isn't installed on this computer.");
  }
}
