import { Clipboard, getSelectedText } from "@raycast/api";

export default async function Swap() {
  const selectedText = await getSelectedText();
  const clipboardContent = await Clipboard.readText();

  if (selectedText) {
    console.debug("copying", selectedText);
    await Clipboard.copy(selectedText);
    console.debug("copied");
  }

  if (clipboardContent) {
    console.debug("pasting", clipboardContent);
    await Clipboard.paste(clipboardContent);
    console.debug("pasted");
  }
}

1234;
12346789;
