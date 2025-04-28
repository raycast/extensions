import { showToast, Toast, getPreferenceValues, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface Preferences {
  application: {
    path: string;
    name: string;
  };
}

export default async function Command() {
  try {
    // Get the application selected in preferences
    const { application } = getPreferenceValues<Preferences>();

    if (!application) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Application Set",
        message: "Please select an application in extension preferences",
      });
      return;
    }

    // Open the application
    await open(application.path);

    await showToast({
      style: Toast.Style.Success,
      title: `Opened Application: ${application.name}`,
    });
  } catch (error) {
    console.error("Failed to open application:", error);

    await showFailureToast(error, { title: "Failed to Open Application" });
  }
}
