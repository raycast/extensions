import { getApplications, showToast, Toast, open, showHUD } from "@raycast/api";

export async function isSpacesInstalled() {
  const applications = await getApplications();
  //   console.log(applications);

  return applications.some(({ bundleId }) => bundleId === "com.pradeepb28.spacesformacos");
}
