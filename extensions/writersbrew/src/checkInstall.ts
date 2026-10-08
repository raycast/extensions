import { getApplications } from "@raycast/api";

export async function isWritersBrewInstalled() {
  const applications = await getApplications();

  return applications.some(({ bundleId }) => bundleId === "com.pradeepb28.Writersbrew-AI");
}
