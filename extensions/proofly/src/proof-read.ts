import { Clipboard, showToast, Toast, getSelectedText, getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

interface Preferences {
  openaiApiKey: string;
}

const preferences = getPreferenceValues<Preferences>();
const openai = new OpenAI({
  apiKey: preferences.openaiApiKey,
});

export default async function Command() {
  try {
    // Try to get selected text first
    const selectedText = await getSelectedText().catch(() => null);

    if (!selectedText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text selected",
        message: "Please select some text to proof read",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Fixing grammar...",
    });

    const response = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      temperature: 0.3,
      prompt: `Please fix any grammar, spelling, or punctuation errors in the following text while preserving the original meaning and style:\n\n${selectedText}`,
      max_tokens: 1000,
    });
    const correctedText = response.choices[0]?.text?.trimStart();

    if (!correctedText) {
      throw new Error("No correction received from OpenAI");
    }

    // Copy the corrected text back to clipboard
    await Clipboard.paste(correctedText);
    await showToast({
      style: Toast.Style.Success,
      title: "Done",
    });
  } catch (error) {
    console.error("Error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error fixing grammar",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
