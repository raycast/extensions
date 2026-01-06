import {
  showToast,
  Toast,
  Clipboard,
  getSelectedText,
  showHUD,
} from "@raycast/api";
import { enhancePrompt } from "./api";
import { addToHistory } from "./history";

export default async function QuickEnhanceCommand() {
  try {
    // Try to get selected text first
    let text: string;
    try {
      text = await getSelectedText();
    } catch {
      // If no selection, try clipboard
      const clipboardText = await Clipboard.readText();
      if (!clipboardText || !clipboardText.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No text found",
          message: "Select text or copy something to clipboard first",
        });
        return;
      }
      text = clipboardText;
    }

    if (!text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty text",
        message: "Selected text is empty",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Enhancing prompt...",
    });

    const result = await enhancePrompt(text.trim());

    // Save to history
    await addToHistory({
      originalPrompt: text.trim(),
      enhancedPrompt: result.enhancedPrompt,
      provider: result.provider,
      model: result.model,
      style: result.style,
    });

    await Clipboard.copy(result.enhancedPrompt);

    await showHUD("✨ Enhanced prompt copied!");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    await showToast({
      style: Toast.Style.Failure,
      title: "Enhancement failed",
      message: errorMessage,
    });
  }
}
