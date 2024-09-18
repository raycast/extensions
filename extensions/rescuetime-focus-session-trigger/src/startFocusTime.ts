import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import got from "got";

export default async () => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting Focus Session",
    message: "RescueTime desktop app can take up to 1 minute to reflect Focus Session",
  });

  interface Preferences {
    APIkey: string;
    defaultFocusDuration: string;
  }

  const preferences = getPreferenceValues<Preferences>();

  if (isNaN(parseInt(preferences.defaultFocusDuration, 10))) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to start Focus Session",
      message: "Default focus session duration needs to be a number",
    });
    return;
  }

  try {
    await got
      .post("https://www.rescuetime.com/anapi/start_focustime", {
        searchParams: {
          key: preferences.APIkey,
          duration: preferences.defaultFocusDuration || "25",
        },
      })
      .json();

    toast.style = Toast.Style.Success;
    toast.title = "Focus Session started";
    toast.message = "RescueTime desktop app can take up to 1 minute to reflect Focus Session";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to start Focus Session";
    toast.message = String(error);
  }
};
