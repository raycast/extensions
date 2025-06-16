import { Clipboard, showToast, Toast } from "@raycast/api";

interface Arguments {
  prefix: string;
  suffix: string;
}

export default async function Command(props: { arguments: Arguments }) {
  const { prefix, suffix } = props.arguments;
  const hasValue = prefix || suffix;

  if (!hasValue) {
    await showToast(Toast.Style.Failure, "No values set to append or prepend");
    return;
  }

  let clipboardText: string | undefined;
  
  try {
    clipboardText = await Clipboard.readText();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to read clipboard",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
    return;
  }
  
  if (!clipboardText) {
    return;
  }
  
  const lines = clipboardText.split("\n");
  
  const modifiedLines = lines.map((line) => prefix + line + suffix);
  
  const modifiedText = modifiedLines.join("\n");
  
  await Clipboard.copy(modifiedText);
  
  await showToast({
    style: Toast.Style.Success,
    title: "Text appended to clipboard content",
  });
}