import { getApplications } from "@raycast/api";

export async function getTextDifferApplication() {
  const applications = await getApplications();
  return applications.find((application) => application.bundleId == "com.proxyman.Text-Differ");
}
