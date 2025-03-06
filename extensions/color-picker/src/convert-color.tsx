import { Clipboard, getSelectedText, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { getFormattedColor } from "./utils";
import { ColorFormatType } from "./types";

async function getConvertedColor(text: string, format: ColorFormatType) {
  try {
    const convertedColor = getFormattedColor(text, format);
    return convertedColor;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Conversion failed",
      message: `"${text}" is not a valid color.`,
    });
  }
}

export default async function ConvertColor(props: LaunchProps) {
  if (props.arguments.text) {
    const convertedColor = await getConvertedColor(props.arguments.text, props.arguments.format);
    if (convertedColor) {
      await Clipboard.copy(convertedColor);
      await showHUD("Copied color to clipboard");
    }
  } else {
    try {
      const selectedText = await getSelectedText();
      const convertedColor = await getConvertedColor(selectedText, props.arguments.format);
      if (convertedColor) {
        await Clipboard.paste(convertedColor);
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
