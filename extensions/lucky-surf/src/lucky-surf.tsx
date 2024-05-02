import { Toast, getPreferenceValues, LaunchProps, open, showToast } from "@raycast/api";
import { getUrl } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.LuckySurf }>) {
  const { preferredBrowser } = getPreferenceValues<ExtensionPreferences>();

  const queryArgument = props.arguments.query;
  try {
    const url = await getUrl(queryArgument);

    // Open the URL with the preferred browser
    await open(url, preferredBrowser);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot Open URL",
      message: (error as Error).message,
    });
  }
}
