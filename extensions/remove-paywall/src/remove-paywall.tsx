import { Toast, getPreferenceValues, LaunchProps, open, showToast } from "@raycast/api";
import { DEFAULT_REMOVE_PAYWALL_SERVICE } from "./constants";
import { getUrl } from "./utils";

export default async (props: LaunchProps<{ arguments: Arguments.RemovePaywall }>) => {
  let service: string;
  if (props.arguments.service) {
    service = props.arguments.service;
  } else {
    const preferences = getPreferenceValues<Preferences>();
    service = preferences.service || DEFAULT_REMOVE_PAYWALL_SERVICE;
  }

  const urlArgument = props.arguments.url;
  try {
    const url = await getUrl(urlArgument);

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
