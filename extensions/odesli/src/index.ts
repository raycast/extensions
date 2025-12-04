import { Clipboard, showToast, showHUD, Toast, LaunchProps } from "@raycast/api";
import { convertToOdesliLink, getTextFromSelectionOrClipboard, SongNotFoundError } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  let text: string | undefined;
  let fromClipboard = true;

  // Check if URL argument is provided
  const urlArg = props.arguments.url?.trim();
  if (urlArg && urlArg.length > 0) {
    text = urlArg;
    fromClipboard = false; // Paste behavior for URL arguments
  } else {
    // Fall back to selection or clipboard
    const result = await getTextFromSelectionOrClipboard();
    text = result.text;
    fromClipboard = result.fromClipboard;
  }

  if (!text) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to convert link.",
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

    if (fromClipboard) {
      await Clipboard.copy(result.url);
      await showHUD(`✓ ${hudMessage}`);
    } else {
      await Clipboard.paste(result.url);
      await showHUD(`✓ ${hudMessage}`);
    }
  } catch (error) {
    if (error instanceof SongNotFoundError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to convert link.",
        message: "Song not found.",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to convert link.",
      message: "Unknown error.",
    });
  }
}
