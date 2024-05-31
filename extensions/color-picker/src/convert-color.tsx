import { getSelectedText, Clipboard, showToast, Toast, LaunchProps, showHUD } from "@raycast/api";
import { getFormattedColor } from "./utils";

export default async function ConvertColor(props: LaunchProps) {
  if (props.arguments.text) {
    await Clipboard.copy(getFormattedColor(props.arguments.text));
    await showHUD("Copied color to clipboard");
  } else {
    try {
      const selectedText = await getSelectedText();
      try {
        const convertedColor = getFormattedColor(selectedText);
        await Clipboard.paste(convertedColor);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Conversion failed",
          message: `"${selectedText}" is not a valid color.`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text found.",
        message: "Select a color in any app, or provide it as argument, then try again.",
      });
    }
  }
}
