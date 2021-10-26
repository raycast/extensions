import { getApplications } from "@raycast/api";

export async function getDashAppPath(): Promise<string> {
  const dashApp = (await getApplications()).find(app => app.bundleId?.indexOf("com.kapeli.dash") === 0);

  if (!dashApp?.path) {
    throw new Error("Dash.app not found");
  }

  return dashApp.path;
}
