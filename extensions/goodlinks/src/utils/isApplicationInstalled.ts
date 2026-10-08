import { getApplications } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function isApplicationInstalled() {
  try {
    const applications = await getApplications();

    const goodlinks = applications.find((app) => app.name.toLowerCase() === "goodlinks");

    return !!goodlinks;
  } catch {
    return false;
  }
}

export async function showMustBeInstalledToast() {
  await showFailureToast("GoodLinks is not installed on your computer.");
}
