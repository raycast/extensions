import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import got from "got";

export default async () => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Ending Focus Session",
    message: "RescueTime desktop app can take up to 1 minute to reflect Focus Session",
  });

  interface Preferences {
    APIkey: string;
  }

  const preferences = getPreferenceValues<Preferences>();

  try {
    await got
      .post("https://www.rescuetime.com/anapi/end_focustime", {
        searchParams: {
          key: preferences.APIkey,
        },
      })
      .json();

    toast.style = Toast.Style.Success;
    toast.title = "Focus Session ended";
    toast.message = "RescueTime desktop app can take up to 1 minute to reflect Focus Session";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to end Focus Session";
    toast.message = String(error);
  }
};
