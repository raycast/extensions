import { Clipboard, showToast, showHUD, Toast, LaunchProps } from "@raycast/api";
import { getTextFromSelectionOrClipboard, convertToOdesliLink, SongNotFoundError } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  let text = undefined;

  const textArg = props.arguments.url?.trim();
  if (textArg && textArg.length > 0) {
    text = textArg;
  } else {
    const result = await getTextFromSelectionOrClipboard();
    text = result.text;
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

    if (text) {
      await Clipboard.copy(result.url);
      await showHUD(`✓ ${hudMessage}`);
      return;
    }

    await Clipboard.paste(result.url);
    await showHUD(`✓ ${hudMessage}`);
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
