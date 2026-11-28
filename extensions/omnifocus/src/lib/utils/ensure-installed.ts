import { getApplications, showToast, Toast } from "@raycast/api";

export async function checkOmniFocusInstalled() {
  const applications = await getApplications();
  const omnifocus = applications.find((a) => a.name.toLowerCase() === "omnifocus");
  return !!omnifocus;
}

export async function showNotInstalledErrorFeedback() {
  // A toast rather than a HUD: a HUD closes Raycast, and the user would lose what they typed.
  await showToast({ style: Toast.Style.Failure, title: "OmniFocus is not installed" });
}
