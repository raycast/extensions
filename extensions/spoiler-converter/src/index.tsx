import { getSelectedText, showToast, Toast, Clipboard, getFrontmostApplication, showHUD } from "@raycast/api";
import { title } from "process";

export default async function Command() {
  const frontmostApplication = await getFrontmostApplication();
  if (frontmostApplication.name == "Discord") {
  try {
      const selectedText = await getSelectedText();
      //selectedText = paper
      // ||p
      //  p||||e
      // r||
      //||||
      Clipboard.paste(sandwichCharacters(selectedText));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Can't transform text",
        message: String(error),
      });
    }

    function sandwichCharacters(str: string): string {
      const parts = str.split(':'); // Split the string into parts containing "::"
      const wrappedParts = parts.map((part, index) => {
        if (index % 2 === 0) {
          // Even-indexed parts are outside the "::"
          const characters = Array.from(part); // Convert part to an array of characters
          return characters.map((char) => `||${char}||`).join(''); // Wrap and combine characters
        } else {
          // Odd-indexed parts are inside the "::"
          if (part.includes(' ')) {
            const parts2 = str.split('');
            const partArr = Array.from(parts2);
            return partArr.map((char) => `||${char}||`).join(''); // Wrap the part with spoilers if it contains a space
          } else {
            return `||:${part}:||`; // Leave the part unchanged without wrapping
          }
        }
      });
      return wrappedParts.join(''); // Combine wrapped parts into a single string using double colons "::"
    }
  } else {
    await showHUD("This extension only works on Discord");
  }

}
