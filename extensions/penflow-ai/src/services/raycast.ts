import { ChatRequest, ChatResponse, TestResult, Message, AIProvider } from "../utils/types";
import { AI } from "@raycast/api";

export class RaycastService {
  private modelMapping: Record<string, AI.Model> = {
    "openai-gpt-4o-mini": AI.Model["OpenAI_GPT4o-mini"],
  };

  constructor(private config: { provider: AIProvider }) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const raycastModel = this.modelMapping[request.model];
      if (!raycastModel) {
        throw new Error(`Unsupported model: ${request.model}`);
      }

      const response = await AI.ask(request.messages[request.messages.length - 1].content, {
        model: raycastModel,
      });

      return {
        content: response.trim(),
      };
    } catch (error) {
      console.error("Chat error:", error);
      throw error;
    }
  }

  async testConnection(debug: boolean = false): Promise<TestResult> {
    try {
      const model = {
        id: "openai-gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "raycast" as AIProvider,
        enabled: true,
      };

      const messages: Message[] = [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        {
          role: "user",
          content: "Please respond with 'Connection successful!' if you receive this message.",
        },
      ];

      const testMessage: ChatRequest = {
        messages,
        model: model.id,
      };

      if (debug) {
        console.log("Debug - Request details:", {
          model: model.id,
          raycastModel: this.modelMapping[model.id],
          messages: testMessage.messages,
        });
      }

      const response = await this.chat(testMessage);

      return {
        success: true,
        message: "Connection test successful",
        details: {
          provider: this.config.provider,
          model: model.id,
          response: response.content,
        },
      };
    } catch (error) {
      console.error("Test connection error:", error);
      return {
        success: false,
        message: "Connection test failed",
        details: {
          provider: this.config.provider,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }
}
