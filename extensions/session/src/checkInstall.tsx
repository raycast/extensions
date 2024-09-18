import { getApplications, showToast, Toast, open, popToRoot, showHUD } from "@raycast/api";

async function isSessionInstalled() {
  const applications = await getApplications();
  let userApplications: typeof applications = [];

  try {
    userApplications = await getApplications("~/Applications");
  } catch (error) {
    // If there's an error getting user applications, we'll just continue with an empty array
    // console.error("Error getting user applications:", error);
  }

  const bundleIds = ["com.philipyoungg.session-setapp", "com.philipyoungg.session", "com.philipyoungg.session-direct"];

  return (
    applications.some(({ bundleId }) => bundleId && bundleIds.includes(bundleId)) ||
    userApplications.some(({ bundleId }) => bundleId && bundleIds.includes(bundleId))
  );
}

export async function SessionInstallationCheck() {
  if (!(await isSessionInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Session is not installed",
      message: "Read more here",
      primaryAction: {
        title: "Download information",
        onAction: (toast) => {
          open("https://www.stayinsession.com");
          toast.hide();
        },
      },
    };

    await showToast(options);
    return false;
  }

  return true;
}
