import { AIRequestOptions, WritingStyle } from "../utils/types";
import { handleError } from "../utils/helpers";
import { aiManager } from "./aiManager";
import { Message, getWordCompletionPrompt, getTranslationPrompt } from "../utils/prompts";

// Use fixed default model
const DEFAULT_MODEL = "openai-gpt-4o-mini";

// Add logging function
function logAICall(type: string, input: string, messages: Message[], response?: string) {
  console.log("\n=== AI Call Log ===");
  console.log("Type:", type);
  console.log("Model:", DEFAULT_MODEL);
  console.log("Input:", input);
  console.log("Messages:", JSON.stringify(messages, null, 2));
  if (response) {
    console.log("Response:", response);
  }
  console.log("================\n");
}

export async function processWithModel(messages: Message[], _options?: AIRequestOptions): Promise<string> {
  try {
    const modelConfig = aiManager.getModelConfig(DEFAULT_MODEL);
    if (!modelConfig) {
      throw new Error(`Model ${DEFAULT_MODEL} not found`);
    }

    const service = aiManager.getService(modelConfig.provider);

    // Log request
    logAICall("Request", "", messages);

    const response = await service.chat({
      messages,
      model: DEFAULT_MODEL,
      temperature: 0.7,
      maxTokens: modelConfig.maxTokens,
    });

    // Log response
    logAICall("Response", "", messages, response.content.trim());

    return response.content.trim();
  } catch (error) {
    handleError(error, "AI processing");
    throw error;
  }
}

export async function getWordCompletions(input: string, options?: AIRequestOptions): Promise<string[]> {
  try {
    const messages = getWordCompletionPrompt(input, options?.style || WritingStyle.Professional);
    logAICall("Word Completion", input, messages);

    const response = await processWithModel(messages, options);

    // Modified to return 5 completion suggestions
    const completions = response
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 5);

    return completions.length > 0 ? completions : [response];
  } catch (error) {
    handleError(error, "word completion");
    throw error;
  }
}

export async function translateMixedText(text: string, options?: AIRequestOptions): Promise<string[]> {
  try {
    const messages = getTranslationPrompt(text);
    logAICall("Translation", text, messages);

    const response = await processWithModel(messages, options);

    // Parse all variants
    const results = response
      .split("\n")
      .filter((line) => line.includes(": "))
      .map((line) => line.split(": ")[1].trim());

    return results.length >= 4 ? results : [response];
  } catch (error) {
    handleError(error, "translation");
    throw error;
  }
}

export function getCurrentAISettings() {
  const modelConfig = aiManager.getModelConfig(DEFAULT_MODEL);

  return {
    model: DEFAULT_MODEL,
    modelName: modelConfig?.name || "Unknown Model",
    style: "Professional",
  };
}
