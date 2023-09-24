import { AI, environment } from "@raycast/api";
import { LLMParams, LLMResponse } from "./interfaces";
import OpenAI from "openai";

/**
 * Asks a question to the LLM (Language Learning Model) using either OpenAI or Raycast models.
 *
 * @param text - The text or question to ask the model.
 * @param LLMParams - The parameters for choosing and interacting with the model.
 * @returns A promise that resolves to an object containing the response text.
 */
const AskLLM = async (text: string, LLMParams: LLMParams): Promise<LLMResponse> => {
  let responseText = "";

  //console.log("AskLLM: LLMParams: ", LLMParams);

  // Handle OpenAI models
  if (LLMParams.modelName.startsWith("OPENAI-")) {
    const modelName = LLMParams.modelName.replace("OPENAI-", "");
    const openai = new OpenAI({ apiKey: LLMParams.openaiApiToken || undefined });
    try {
      const result = await openai.chat.completions.create({
        model: modelName,
        temperature: LLMParams.creativity,
        messages: [{ role: "user", content: text }],
      });
      responseText = result.choices[0].message?.content || "";
    } catch (error) {
      // TODO: add toast
      if (error instanceof Error) {
        error.message = "Openai completions: " + error.message;
        error.name = "OPENAI_COMPLETIONS_ERROR";
      }
      throw error;
    }
  }
  // Handle Raycast models
  else if (LLMParams.modelName.startsWith("raycast")) {
    const modelName = LLMParams.modelName.replace("raycast-", "");
    try {
      const result = await AI.ask(text, { model: modelName as AI.Model, creativity: LLMParams.creativity });
      responseText = result || "";
    } catch (error) {
      if (error instanceof Error) {
        error.name = "RAYCASTAI_ASK_ERROR";
        error.message = "AI.ask: " + error.message;
      }
    }
  }
  // Handle unsupported models
  else {
    throw new Error("Unsupported AI model");
  }

  return { text: responseText };
};

export default AskLLM;
