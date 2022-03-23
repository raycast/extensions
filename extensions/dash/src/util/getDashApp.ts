import { Application, getApplications } from "@raycast/api";

export default async function getDashApp(): Promise<Application> {
  const dashApp = (await getApplications()).find((app) => app.bundleId?.indexOf("com.kapeli.dash") === 0);

  if (!dashApp) {
    throw new Error("Dash.app not found");
  }

  return dashApp;
}
