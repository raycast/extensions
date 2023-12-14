import { Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import { getUrl } from "./utils";

export default async () => {
  const { service } = await getPreferenceValues<Preferences>();

  try {
    const url = await getUrl();

    if (typeof url !== "string") {
      throw url;
    }

    // Open the URL with the specified service
    open(`${service}/${url}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot remove paywall",
      message: (error as Error).message,
    });
  }
};
