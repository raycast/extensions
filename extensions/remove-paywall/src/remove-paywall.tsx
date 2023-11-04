import { LaunchProps, Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import { getExistingText, isUrl } from "./utils";

export default async (props: LaunchProps<{ arguments: Arguments.RemovePaywall }>) => {
  const { service } = await getPreferenceValues<Preferences>();

  try {
    const argumentText = props.arguments.url?.trim() ?? "";
    const existingText = await getExistingText(props.fallbackText);
    const url = [argumentText, existingText].find((v) => !!v);

    if (!url) {
      throw new Error("No URL provided.");
    }

    if (!isUrl(url)) {
      throw new Error(`Invalid URL: "${url}"`);
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
