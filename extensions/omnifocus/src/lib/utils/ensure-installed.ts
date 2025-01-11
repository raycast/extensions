import { getApplications, showHUD } from "@raycast/api";

export async function checkOmniFocusInstalled() {
  const applications = await getApplications();
  const omnifocus = applications.find((a) => a.name.toLowerCase() === "omnifocus");
  if (!omnifocus) {
    await showHUD("OmniFocus is not installed");
    return false;
  }
  return true;
}
