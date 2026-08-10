import { Message } from "./types";

export enum ModelType {
  GPT_OSS = "gpt-oss",
  CHAT = "chat",
  TEXT_GENERATION = "text-generation",
}

export function detectModelType(model: string): ModelType {
  if (model.includes("gpt-oss")) {
    return ModelType.GPT_OSS;
  }

  if (
    model.includes("llama") ||
    model.includes("mistral") ||
    model.includes("granite") ||
    model.includes("qwen") ||
    model.includes("gemma") ||
    model.includes("phi")
  ) {
    return ModelType.CHAT;
  }

  return ModelType.TEXT_GENERATION;
}

export function buildRequestBody(prompt: string, modelType: ModelType): object {
  switch (modelType) {
    case ModelType.GPT_OSS:
      return {
        input: [
          {
            role: "user",
            content: prompt,
          },
        ],
      };

    case ModelType.CHAT:
      return {
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      };

    case ModelType.TEXT_GENERATION:
      return {
        prompt: prompt,
      };
  }
}

export function buildRequestBodyWithHistory(messages: Message[], modelType: ModelType): object {
  switch (modelType) {
    case ModelType.GPT_OSS:
      // GPT_OSS models use 'input' field with full message array
      return {
        input: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      };

    case ModelType.CHAT:
      // Chat models (Llama, Mistral, etc.) use 'messages' field with full array
      return {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      };

    case ModelType.TEXT_GENERATION: {
      // TEXT_GENERATION models don't natively support conversation context
      // Concatenate conversation history as formatted text
      const conversationText = messages
        .map((msg) => {
          const prefix = msg.role === "user" ? "Q: " : "A: ";
          return prefix + msg.content;
        })
        .join("\n\n");

      return {
        prompt: conversationText,
      };
    }
  }
}

export function formatModelName(name: string): string {
  const parts = name.split("/");
  const modelName = parts[parts.length - 1];
  return modelName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
