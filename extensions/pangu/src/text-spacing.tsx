import { LaunchProps, Clipboard, getSelectedText, showToast, showHUD, Toast } from "@raycast/api";
import pangu from "pangu";

// Function to add spacing to a given text
const addSpacingToText = (str: string) => pangu.spacing(str);

export default async function main(props: LaunchProps) {
  if (props.arguments.text) {
    await Clipboard.copy(addSpacingToText(props.arguments.text));
    await showHUD("Copied to clipboard!");
  } else {
    try {
      const selectedText = await getSelectedText();
      await Clipboard.paste(addSpacingToText(selectedText));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text found.",
        message: "Select text in any app, or provide it as argument, then try again.",
      });
    }
  }
}
