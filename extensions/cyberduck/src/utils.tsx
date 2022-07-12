import { getApplications } from "@raycast/api";

export async function IsCyberduckInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "ch.sudo.cyberduck");
}
