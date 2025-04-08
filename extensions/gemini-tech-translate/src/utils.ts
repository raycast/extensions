// src/utils.ts
import { getSelectedText, Clipboard } from "@raycast/api";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerateContentRequest } from "@google/generative-ai";

export interface Preferences {
  geminiApiKey: string;
  geminiModel: string;
}

// 入力テキストを取得する関数
export async function getInputText(): Promise<string> {
  let inputText = "";
  try {
    inputText = await getSelectedText();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    console.info("No text selected, trying clipboard.");
    const clipboardText = await Clipboard.readText();
    if (clipboardText) {
      inputText = clipboardText;
    }
  }

  if (!inputText.trim()) {
    throw new Error("No Text Found. Select text or copy to clipboard.");
  }
  return inputText.trim();
}

// Gemini APIを呼び出すコア関数
export async function callGemini(prompt: string, apiKey: string, modelName: string): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const generationRequest: GenerateContentRequest = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      safetySettings: safetySettings,
    };

    const result = await model.generateContent(generationRequest);
    const response = result.response;

    let outputText = "";
    if (response && typeof response.text === "function") {
      outputText = response.text().trim();
    } else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      outputText = response.candidates[0].content.parts[0].text.trim();
    }

    if (!outputText) {
      console.warn("Response structure might have changed or text is empty:", response);
      throw new Error("Could not extract valid text from response.");
    }
    return outputText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    let message = "Failed to call Gemini API";
    if (error instanceof Error) {
      if (error.message.includes("SAFETY")) {
        message = "Blocked due to safety settings.";
      } else {
        // 他のAPIエラーメッセージなども考慮できる
        message = error.message;
      }
    }
    // エラーを再スローして呼び出し元で処理する
    throw new Error(message);
  }
}
