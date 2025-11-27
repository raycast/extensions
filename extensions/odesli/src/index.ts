import { Clipboard, showToast, showHUD, Toast, LaunchProps } from "@raycast/api";
import { convertToOdesliLink, SongNotFoundError } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const url = props.arguments.url?.trim();

  if (!url) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to convert link.",
      message: "Please provide a valid URL.",
    });
    return;
  }

  try {
    const result = await convertToOdesliLink(url);

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
