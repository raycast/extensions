import {
  Clipboard,
  getPreferenceValues,
  getSelectedText,
  LaunchProps,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { saveToCl1p } from "./lib/cl1p";

interface Preferences {
  apiToken: string;
}

interface Arguments {
  title: string;
}

export default async function Command(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { title } = props.arguments;

  let content: string;
  try {
    content = await getSelectedText();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text selected",
      message: "Select text in another app before running this command",
    });
    return;
  }

  if (!content.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text selected",
      message: "Select text in another app before running this command",
    });
    return;
  }

  const { apiToken } = getPreferenceValues<Preferences>();

  await showToast({ style: Toast.Style.Animated, title: "Saving..." });

  try {
    const result = await saveToCl1p(title, content, apiToken);
    if (!result.ok) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Save failed",
        message: result.message,
      });
      return;
    }

    await Clipboard.copy(result.url);
    await showHUD(`Saved · ${result.url} copied to clipboard`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Network error",
      message: String(error),
    });
  }
}
