import { AIResponse } from "./types";

export function parseAIResponse(data: AIResponse): string {
  const result = data.result;

  // Format 1: result.response (Qwen, Llama, Mistral and most models)
  if (typeof result === "object" && result !== null && "response" in result && result.response) {
    return result.response;
  }

  // Format 2: OpenAI Responses API format (e.g., GPT-OSS models)
  if (typeof result === "object" && result !== null && "output" in result && Array.isArray(result.output)) {
    const messageOutput = result.output.find(
      (item: { type?: string; role?: string }) => item.type === "message" && item.role === "assistant",
    );
    if (messageOutput && Array.isArray(messageOutput.content)) {
      const textContent = messageOutput.content.find(
        (c: { type?: string; text?: string }) => c.type === "output_text" && c.text,
      );
      if (textContent && textContent.text) {
        return textContent.text;
      }
    }
  }

  // Format 3: OpenAI-style chat completion (e.g., Granite models)
  if (typeof result === "object" && result !== null && "choices" in result && Array.isArray(result.choices)) {
    const content = result.choices?.[0]?.message?.content;
    if (content) {
      return content;
    }
  }

  // Format 4: result as string directly
  if (typeof result === "string") {
    return result;
  }

  // Format 5: result as array with content/generated_text
  if (Array.isArray(result) && result.length > 0) {
    const firstResult = result[0];
    if (typeof firstResult === "object" && firstResult !== null) {
      if ("content" in firstResult && firstResult.content) {
        return firstResult.content;
      }
      if ("generated_text" in firstResult && firstResult.generated_text) {
        return firstResult.generated_text;
      }
    }
  }

  // Fallback: Log the structure and return stringified result for debugging
  console.error("Unknown response format:", JSON.stringify(result, null, 2));
  return JSON.stringify(result, null, 2);
}
