import { getApplications, showToast, Toast } from "@raycast/api";

export async function isApplicationInstalled() {
  const applications = await getApplications();

  const goodlinks = applications.find((app) => app.name === "GoodLinks");

  return !!goodlinks;
}

export async function showMustBeInstalledToast() {
  await showToast({
    title: "GoodLinks is not installed on your computer.",
    style: Toast.Style.Failure,
  });
}
