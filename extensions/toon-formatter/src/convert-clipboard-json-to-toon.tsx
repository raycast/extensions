// src/convert-clipboard-json-to-toon.tsx
import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { encode } from "@toon-format/toon";

export default async function main() {
  try {
    const text = await Clipboard.readText();

    if (!text) {
      await showHUD("No text in clipboard");
      return;
    }

    const data = JSON.parse(text);

    const toon = encode(data);

    await Clipboard.copy(toon);
    await showHUD("Copied to clipboard (TOON ready)");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Conversion failed",
      message: String(error),
    });
  }
}
