import { Clipboard, showToast, Toast } from "@raycast/api";

interface Arguments {
  prefix: string;
  suffix: string;
}

export default async function Command(props: { arguments: Arguments }) {
  const { prefix, suffix } = props.arguments;
  const hasValue = prefix || suffix;

  if (!hasValue) {
    await showToast(Toast.Style.Failure, "No values set to apppend or prepend");
    return;
  }

  const clipboardText = await Clipboard.readText();

  if (!clipboardText) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text found in clipboard",
    });
    return;
  }

  // Split the clipboard text by newlines
  const lines = clipboardText.split("\n");

  // Append the text to each line
  const modifiedLines = lines.map((line) => prefix + line + suffix);

  // Join the lines back together
  const modifiedText = modifiedLines.join("\n");

  // Copy the modified text back to the clipboard
  await Clipboard.copy(modifiedText);

  await showToast({
    style: Toast.Style.Success,
    title: "Text appended to clipboard content",
  });
}
