import { getApplications, showToast, Toast, open, popToRoot, showHUD } from "@raycast/api";

async function isSessionInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) =>
    bundleId ? ["com.philipyoungg.session-setapp", "com.philipyoungg.session"].includes(bundleId) : false
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
