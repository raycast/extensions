import { Clipboard, showHUD } from "@raycast/api";

export async function pasteTransformed(transform: (text: string) => string): Promise<void> {
  let text: string | undefined;

  try {
    text = await Clipboard.readText();
  } catch {
    await showHUD("Could not read clipboard text. Try copying it again.");
    return;
  }

  if (text === undefined || text.length === 0) {
    await showHUD("No text on the clipboard. Copy some text first.");
    return;
  }

  try {
    const transformed = transform(text);

    if (transformed.length === 0) {
      await showHUD("Nothing to paste after removing whitespace.");
      return;
    }

    await Clipboard.paste(transformed);
  } catch {
    // Avoid logging clipboard contents or including them in an error report.
    await showHUD("Could not paste. Focus a text field and check Raycast’s Accessibility permission.");
  }
}
