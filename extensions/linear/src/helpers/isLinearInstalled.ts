import { getApplications } from "@raycast/api";

export let isLinearInstalled = false;

export async function checkLinearApp() {
  const applications = await getApplications();
  const linearApp = applications.find((app) => app.bundleId === "com.linear");
  isLinearInstalled = !!linearApp;
}
