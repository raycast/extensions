import { showHUD, Clipboard } from "@raycast/api";
import { convertMarkdownToTsv } from "./usecase/convert-markdown-to-tsv";

export default async function main() {
  try {
    const clipboard = (await Clipboard.read()).text;
    if (!clipboard) {
      await showHUD("❌ Clipboard is empty");
      return;
    }

    const tsv = await convertMarkdownToTsv(clipboard);
    await Clipboard.copy(tsv);
    await showHUD("✅ Converted to TSV");
  } catch (error) {
    if (error instanceof Error) {
      await showHUD(`❌ ${error.message}`);
    } else {
      await showHUD("❌ An unexpected error occurred");
    }
  }
}
