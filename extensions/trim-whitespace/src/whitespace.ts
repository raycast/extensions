import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  const clipboardContent = await Clipboard.read();
  // check if clipboard content is a number
  // if (isNaN(Number(clipboardContent.text.replace(/\s/g, "")))) {
  //   await showHUD("Clipboard content is not a number");
  //   return;
  // }
  const trimmedText = clipboardContent.text.replace(/\s/g, "");
  await Clipboard.copy(trimmedText);
  await showHUD("Copied to clipboard");
}
