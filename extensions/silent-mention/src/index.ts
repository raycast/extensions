import { LaunchProps, Clipboard, getSelectedText, showToast, Toast, showHUD } from "@raycast/api";

const makeSilent = (str: string) => str.replace(/[.#@]/g, (match) => match + "\u2060");

export default async function main(props: LaunchProps) {
  if (props.arguments.text) {
    await Clipboard.copy(makeSilent(props.arguments.text));
    await showHUD("Copied to clipboard!");
  } else {
    try {
      const selectedText = await getSelectedText();
      await Clipboard.paste(makeSilent(selectedText));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text found.",
        message: "Select text in any app, or provide it as argument, then try again.",
      });
    }
  }
}
