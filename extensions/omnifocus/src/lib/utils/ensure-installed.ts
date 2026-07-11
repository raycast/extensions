import { getApplications, showHUD } from "@raycast/api";

export async function checkOmniFocusInstalled() {
  const applications = await getApplications();
  const omnifocus = applications.find((a) => a.name.toLowerCase() === "omnifocus");
  return !!omnifocus;
}

export async function showNotInstalledErrorFeedback() {
  await showHUD("OmniFocus is not installed");
}
