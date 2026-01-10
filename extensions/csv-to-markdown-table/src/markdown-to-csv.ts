import { showHUD, Clipboard } from "@raycast/api";
import { convertMarkdownToCsv } from "./usecase/convert-markdown-to-csv";

export default async function main() {
  try {
    const clipboard = (await Clipboard.read()).text;
    if (!clipboard) {
      await showHUD("❌ Clipboard is empty");
      return;
    }

    const csv = await convertMarkdownToCsv(clipboard);
    await Clipboard.copy(csv);
    await showHUD("✅ Converted to CSV");
  } catch (error) {
    if (error instanceof Error) {
      await showHUD(`❌ ${error.message}`);
    } else {
      await showHUD("❌ An unexpected error occurred");
    }
  }
}
