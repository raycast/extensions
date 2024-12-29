import { BaseService } from "./baseService";
import { AIServiceConfig, ChatRequest, ChatResponse, TestResult } from "../utils/types";

export class OpenAIService extends BaseService {
  constructor(config: AIServiceConfig) {
    super(config);
  }

  async chat(_request: ChatRequest): Promise<ChatResponse> {
    throw new Error("OpenAI service not implemented");
  }

  async testConnection(): Promise<TestResult> {
    return {
      success: false,
      message: "OpenAI service not implemented",
      details: {
        provider: this.config.provider,
        error: "Service not implemented",
      },
    };
  }
}
