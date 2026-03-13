import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default async function getResponse({
  prompt,
  modelName,
  apiKey,
  files,
  apiBaseURL = "https://api.fuelix.ai/v1",
}: {
  prompt: string | ChatMessage[];
  modelName: string;
  apiKey: string;
  files?: Buffer[];
  apiBaseURL?: string;
}): Promise<string> {
  try {
    const model = createOpenAICompatible({
      baseURL: apiBaseURL,
      name: "Fuelix",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }).chatModel(modelName);

    let result;

    // If files are provided, create a message with image content
    if (files && files.length > 0) {
      // When files are provided, prompt should be a string
      const textPrompt = typeof prompt === "string" ? prompt : "Analyze this image";
      const messages = [
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: textPrompt,
            },
            ...files.map((file) => ({
              type: "image" as const,
              image: file,
            })),
          ],
        },
      ];

      result = await generateText({
        model,
        messages,
      });
    } else if (typeof prompt === "string") {
      // Simple text prompt mode
      result = await generateText({
        model,
        prompt,
      });
    } else {
      // ChatMessage[] mode for chat conversations
      result = await generateText({
        model,
        messages: prompt,
      });
    }
    return result.text;
  } catch (e) {
    console.error("Error generating text:", e);
    return "Failed to generate text";
  }
}
