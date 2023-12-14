import { Toast, getPreferenceValues, LaunchProps, open, showToast } from "@raycast/api";
import { getUrl } from "./utils";

export default async (props: LaunchProps<{ arguments: Arguments.RemovePaywall }>) => {
  let service;
  if (props.arguments.service) {
    service = props.arguments.service;
  } else {
    const preferences = await getPreferenceValues<Preferences>();
    service = preferences.service;
  }

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
