import { getSelectedText, Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { LLM } from "./llm";

/**
 * Universal function for commands that modify text in the editor (translation, correction, etc.)
 * @param prompt - system prompt for LLM
 * @param options - options for LLM (e.g., temperature)
 * @param hudMessage - message for HUD at start
 * @param successMessage - message for HUD on success
 * @param errorMessage - message for HUD on error
 * @param parseResult - function for parsing the result (by default, result from JSON)
 */
export async function textEditCommand({
  prompt,
  options = {},
  hudMessage = "Processing...",
  successMessage = "Done",
  errorMessage = "Error",
  parseResult = (r: { result: string }) => r.result,
}: {
  prompt: string;
  options?: Record<string, unknown>;
  hudMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  parseResult?: (r: { result: string }) => string;
}) {
  try {
    const selectedText = await getSelectedText();
    await showHUD(hudMessage);
    const llm = new LLM();
    const resultObj = await llm.completeSync(prompt, selectedText, options);
    const result = parseResult(resultObj as { result: string });
    await Clipboard.paste(result);
    await showHUD(successMessage);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: errorMessage,
      message: String(error),
    });
  }
}
