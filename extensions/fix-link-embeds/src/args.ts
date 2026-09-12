import { showHUD, Clipboard, showToast, Toast, LaunchProps } from "@raycast/api";
import { linkReplacer } from "./util/linkReplacer";

export default async function main(props: LaunchProps<{ arguments: { link: string } }>) {
  try {
    const replacedString = linkReplacer(props.arguments.link);
    if (!replacedString) return;

    await Clipboard.copy(replacedString);
    showHUD("Copied to clipboard");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: String(err),
    });
  }
}
