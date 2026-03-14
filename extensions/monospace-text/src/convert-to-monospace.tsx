import { Clipboard, getSelectedText, showHUD } from "@raycast/api";

let lastProcessed = "";

function toMonospace(text: string) {
  return [...text]
    .map((c) => {
      const code = c.charCodeAt(0);

      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d670 + code - 65);
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d68a + code - 97);
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7f6 + code - 48);

      return c;
    })
    .join("");
}

function isMonospace(text: string) {
  return /[\u{1D670}-\u{1D6A3}\u{1D7F6}-\u{1D7FF}]/u.test(text);
}

export default async function Command() {
  try {
    const text = (await getSelectedText()).trim();

    // 1 Empty selection
    if (!text) {
      await showHUD("No text selected.");
      return;
    }

    // 2 Same text processed recently
    if (text === lastProcessed) {
      return;
    }

    // 3 Already monospace
    if (isMonospace(text)) {
      await showHUD("Selected text is already in Monospace.");
      return;
    }

    const mono = toMonospace(text);

    await Clipboard.copy(mono);
    lastProcessed = text;

    await showHUD("Text converted to Monospace and copied to clipboard.");
  } catch {
    await showHUD("No text selected.");
  }
}
