import { getApplications } from "@raycast/api";

export async function getKalApp() {
  const applications = await getApplications();
  return applications.find((application) => application.bundleId == "app.kaleidoscope.v4");
}
