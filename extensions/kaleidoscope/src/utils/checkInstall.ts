import { showToast, Toast, open, getApplications } from "@raycast/api";

const skipCheck = false;

export const KALEIDOSCOPE_BUNDLE_ID = "app.kaleidoscope.v4";

export async function checkKaleidoscopeInstallation() {
  const applicationData = await getKalApp();

  if (!applicationData) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Kaleidoscope Not Installed",
      message: "Get it from https://kaleidoscope.app",
      primaryAction: {
        title: "Download from kaleidoscope.app/download",
        onAction: (toast) => {
          open("https://kaleidoscope.app/download");
          toast.hide();
        },
      },
      secondaryAction: {
        title: "Open Kaleidoscope Website",
        onAction: (toast) => {
          open("https://kaleidoscope.app");
          toast.hide();
        },
      },
    };

    await showToast(options);
    return;
  }

  return applicationData;
}

async function getKalApp() {
  const applications = await getApplications();
  if (skipCheck) {
    if (applications.length > 0) {
      console.log("Debug mode: returning first application:", applications[0]);
      return applications[0];
    } else {
      console.log("Debug mode: Raycast did not return any applications.");
      return null;
    }
  }
  return applications.find((application) => application.bundleId == KALEIDOSCOPE_BUNDLE_ID);
}
