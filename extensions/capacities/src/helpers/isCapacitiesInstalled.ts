import { getApplications } from "@raycast/api";

export let isCapacitiesInstalled = false;

export async function checkCapacitiesApp() {
  const applications = await getApplications();
  const capacitiesApp = applications.find((app) => app.bundleId === "io.capacities.app");
  isCapacitiesInstalled = !!capacitiesApp;
}
