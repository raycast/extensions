import { getSelectedText, showToast, Toast, Clipboard, getPreferenceValues, closeMainWindow } from "@raycast/api";
import { GoogleGenAI, Type } from "@google/genai";

interface Preferences {
  geminiApiKey: string;
}

interface CorrectionResponse {
  correctedText: string;
  hasError: boolean;
  corrections: Array<{
    before: string;
    after: string;
  }>;
}

export default async function Command() {
  let loadingToast: Toast | null = null;

  try {
    // Get preferences and validate API key
    const preferences = getPreferenceValues<Preferences>();

    if (!preferences.geminiApiKey?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing API Key",
        message: "Please set your Gemini API key in preferences",
      });
      return;
    }

    await closeMainWindow();

    // Show loading toast
    loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Fixing typos...",
      message: "Getting selected text",
    });

    // Get selected text
    const selectedText = await getSelectedText();

    // Validate selected text
    if (!selectedText?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty Selection",
        message: "Please select some text to fix",
      });
      return;
    }

    // Update loading toast
    if (loadingToast) {
      loadingToast.message = "Analyzing text with AI...";
    }

    // Initialize Google GenAI
    const ai = new GoogleGenAI({ apiKey: preferences.geminiApiKey });

    // Call Gemini API with structured output
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: `Please fix any typos, spelling errors, and grammar mistakes in the following text. If there are no corrections needed, return an empty string in correctedText field and an empty corrections array.

Text to correct:
${selectedText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correctedText: {
              type: Type.STRING,
              description: "The corrected text, or empty string if no corrections needed",
            },
            hasError: {
              type: Type.BOOLEAN,
              description: "True if the initial text has errors, false otherwise",
            },
            corrections: {
              type: Type.ARRAY,
              description: "Array of corrections made",
              items: {
                type: Type.OBJECT,
                properties: {
                  before: {
                    type: Type.STRING,
                    description: "Original word or expression before correction",
                  },
                  after: {
                    type: Type.STRING,
                    description: "Corrected word or expression after correction",
                  },
                },
                required: ["before", "after"],
              },
            },
          },
          required: ["correctedText", "hasError", "corrections"],
        },
      },
    });

    // Parse the structured response
    if (!response.text) {
      throw new Error("Empty response from AI");
    }
    const result: CorrectionResponse = JSON.parse(response.text);

    // Check for AI processing errors
    if (!result.hasError) {
      await showToast({
        style: Toast.Style.Success,
        title: "No Typos Found",
        message: "The selected text is already correct",
      });
      return;
    }

    // Update loading toast
    if (loadingToast) {
      loadingToast.message = "Pasting corrected text...";
    }

    // Paste the corrected text using Raycast API
    await Clipboard.paste(result.correctedText);

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Typos Fixed!",
      message:
        result.corrections.length > 0
          ? `${result.corrections.length} correction${result.corrections.length > 1 ? "s" : ""} made and pasted successfully`
          : "Text checked - no corrections needed",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: `Failed to fix typos: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
