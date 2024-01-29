import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  try {
    const link = await Clipboard.readText();
    if (link) {
      console.log(link);
      const matches = link.match(/\d+/);
      if (matches !== null) {
        let firstNumber = matches[0];
        let newLink = link.replace("/" + firstNumber, "");
        let finalLink = newLink.replace(".com", ".com/l");
        console.log(finalLink);
        await Clipboard.copy(finalLink);
        await showHUD("Copied sharable link to clipboard");
      } else {
        await showHUD("No portal ID found in the link");
      }
    } else {
      await showHUD("No link found in the clipboard");
    }
  } catch (error) {
    console.error("Error processing link:", error);
    await showHUD("Failed to copy sharable link to clipboard");
  }
}
