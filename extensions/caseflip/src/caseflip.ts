import { Clipboard, showHUD } from "@raycast/api";

// Function to flip upper/lower cases but keep spaces and punctiation
function flip(text: string): string {
  let result = "";
  for (const char of text) {
    if (char >= "A" && char <= "Z") {
      result += char.toLowerCase();
    } else if (char >= "a" && char <= "z") {
      result += char.toUpperCase();
    } else {
      result += char;
    }
  }
  return result;
}

export default async function Command() {
  const originalText: string = await Clipboard.readText(); // read current clipboard
  const invertedText = flip(originalText); // flip it
  await Clipboard.copy(invertedText); // Copy in clip board
  await Clipboard.paste(invertedText); // Paste it
  await showHUD("CaseFlipped!"); // Show message
}
