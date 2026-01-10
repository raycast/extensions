import { showHUD, Clipboard } from "@raycast/api";
import { convertCsvToMarkdown } from "./usecase/convert-csv-to-markdown";

export default async function main() {
  try {
    const clipboard = (await Clipboard.read()).text;
    if (!clipboard) {
      await showHUD("❌ Clipboard is empty");
      return;
    }

    const markdownTable = await convertCsvToMarkdown(clipboard);
    await Clipboard.copy(markdownTable);
    await showHUD("✅ Conversion completed");
  } catch (error) {
    if (error instanceof Error) {
      await showHUD(`❌ ${error.message}`);
    } else {
      await showHUD("❌ An unexpected error occurred");
    }
  }
}
