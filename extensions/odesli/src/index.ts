import { Clipboard, showToast, showHUD, Toast, LaunchProps } from "@raycast/api";
import { convertToOdesliLink, getTextFromSelectionOrClipboard, SongNotFoundError } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  // Get text from argument or clipboard/selection
  let text: string | undefined;
  const urlArg = props.arguments.url?.trim();

  if (urlArg && urlArg.length > 0) {
    text = urlArg;
  } else {
    const result = await getTextFromSelectionOrClipboard();
    text = result.text?.trim();
  }

  if (!text) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Link Found",
      message: "Please select a link or copy it to clipboard.",
    });
    return;
  }

  try {
    const result = await convertToOdesliLink(text);

    // Create a descriptive HUD message
    let hudMessage = "Odesli link copied!";
    if (result.title && result.artist) {
      hudMessage = `${result.title} - ${result.artist}`;
    } else if (result.title) {
      hudMessage = result.title;
    }

    await Clipboard.copy(result.url);
    await showHUD(`✓ ${hudMessage}`);
  } catch (error) {
    if (error instanceof SongNotFoundError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Music Link",
        message: "The provided link is not a valid song or album link. Please check the URL and try again.",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Conversion Failed",
      message: "Unable to convert the link. Please check your internet connection and try again.",
    });
  }
}
