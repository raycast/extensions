import { showHUD } from "@raycast/api";
import { validateSelectedText } from "./utils/text-validator";

/**
 * Command to test if selected text is editable
 */
export default async function Command() {
  try {
    const result = await validateSelectedText();
    console.log("Validation result:", result);

    const message = result.isEditable
      ? "✅ Texte éditable"
      : `❌ Pas éditable${result.reason ? ` (${result.reason})` : ""}`;

    await showHUD(message);
  } catch (error) {
    console.error("Error in test command:", error);
    await showHUD("❌ Erreur lors du test");
  }
}
