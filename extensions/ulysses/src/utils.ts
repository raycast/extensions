import { getApplications, showToast, ToastStyle, closeMainWindow } from "@raycast/api";
import open from "open";

async function isUlyssesInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "com.ulyssesapp.mac");
}

export async function openUlyssesCallback(url: string) {
  if (!(await isUlyssesInstalled())) {
    await showToast(ToastStyle.Failure, "Ulysses is not installed", "https://ulysses.app/");
    return;
  } else {
    await closeMainWindow();
    await open(url);
  }
}
