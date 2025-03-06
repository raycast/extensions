import { getApplications } from "@raycast/api";

export let isHeightInstalled = false;

export async function checkHeightApp() {
  const applications = await getApplications();
  const heightApp = applications.find((app) => app.bundleId === "app.height");
  isHeightInstalled = !!heightApp;
}
