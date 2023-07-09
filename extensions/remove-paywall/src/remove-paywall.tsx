import { LaunchProps, Toast, getPreferenceValues, getSelectedText, open, showToast } from "@raycast/api";

interface Preferences {
  service: string;
}

function isUrl(text: string): boolean {
  return /^https?:\/\//.test(text);
}

export default async (props: LaunchProps<{ arguments: Arguments.RemovePaywall }>) => {
  const { service } = await getPreferenceValues<Preferences>();

  // Get the selected text (if any)
  let selectedText = "";

  try {
    selectedText = (await getSelectedText()).trim();
  } catch {
    // Ignore errors
  }

  try {
    const argumentText = props.arguments.url?.trim() ?? "";
    const fallbackText = props.fallbackText?.trim() ?? "";
    const url = [argumentText, fallbackText, selectedText].find((v) => !!v);

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
      message: String(error),
    });
  }
};
