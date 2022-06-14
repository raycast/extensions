import { getApplications, showToast, Toast, open } from "@raycast/api";

async function isSipInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) =>
    bundleId ? ["io.sipapp.Sip-setapp", "io.sipapp.Sip", "io.sipapp.Sip-paddle"].includes(bundleId) : false
  );
}

export async function SipInstallationCheck() {
  if (!(await isSipInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Sip is not installed",
      message: "Read more here",
      primaryAction: {
        title: "Download information",
        onAction: (toast) => {
          open("https://www.sipapp.io");
          toast.hide();
        },
      },
    };

    await showToast(options);
    return false;
  }

  return true;
}
