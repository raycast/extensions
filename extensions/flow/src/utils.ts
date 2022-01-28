import { getApplications } from "@raycast/api";

export async function isFlowInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "design.yugen.Flow");
}
