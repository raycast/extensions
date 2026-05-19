import {
  Clipboard,
  getPreferenceValues,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { GoogleGenAI } from "@google/genai";

interface Preferences {
  geminiApiKey: string;
  model: string;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function processSelectedText(options: {
  loadingTitle: string;
  successTitle: string;
  emptyTitle: string;
  prompt: string;
  temperature?: number;
}) {
  const preferences = getPreferenceValues<Preferences>();

  const ai = new GoogleGenAI({
    apiKey: preferences.geminiApiKey,
  });

  let selectedText = "";

  try {
    selectedText = await getSelectedText();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not get selected text",
      message: "Check Raycast access in Privacy & Security → Accessibility",
    });

    return;
  }

  if (!selectedText.trim()) {
    await showHUD("Select some text first");
    return;
  }

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: options.loadingTitle,
    });

    const fullPrompt = `${options.prompt}

---BEGIN USER TEXT---
${selectedText}
---END USER TEXT---`;

    const response = await ai.models.generateContent({
      model: preferences.model,
      contents: fullPrompt,
      config: {
        temperature: options.temperature ?? 0,
      },
    });

    const resultText = response.text?.trim();

    if (!resultText) {
      await showToast({
        style: Toast.Style.Failure,
        title: options.emptyTitle,
      });

      return;
    }

    await Clipboard.paste(resultText);

    await showHUD(options.successTitle);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: getErrorMessage(error),
    });
  }
}
