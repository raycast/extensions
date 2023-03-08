import { showHUD, Clipboard, showToast, Toast, LaunchProps } from "@raycast/api";
import { regexList } from "./assets/regexList";

export default async function main(props: LaunchProps<{ arguments: { link: string } }>) {
  try {
    let newString = props.arguments.link;

    for (const item of regexList) {
      newString = newString.replace(item.test, item.replace);
    }

    if (props.arguments.link === newString) {
      showHUD("No text to transform");
      return;
    }

    await Clipboard.copy(newString);
    showHUD("Copied to clipboard");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: String(err),
    });
  }
}
