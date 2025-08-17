import { Clipboard, getSelectedText, getPreferenceValues, showHUD } from "@raycast/api";
import { processText } from "./utils";

export default async function main() {
  try {
    const input = (await getSelectedText().catch(() => Clipboard.readText()))?.trim();
    if (!input) {
      await showHUD("❌ No text found");
      return;
    }

    const { apiKey } = getPreferenceValues<{ apiKey: string }>();
    if (!apiKey) {
      await showHUD("❌ API key not found. Please set it in preferences.");
      return;
    }

    const processedContent = await processText(input, apiKey);
    await Clipboard.paste(processedContent);
    await showHUD("✅ Text fixed");
  } catch (err) {
    // Check if err is an Error object and has a message property
    if (err instanceof Error) {
      await showHUD(`❌ Error: ${err.message}`);
    } else {
      await showHUD(`❌ Error: ${String(err)}`);
    }
  }
}
