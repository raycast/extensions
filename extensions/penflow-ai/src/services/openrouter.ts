import { BaseService } from "./baseService";
import {
  AIServiceConfig,
  ChatRequest,
  ChatResponse,
  TestResult,
} from "../utils/types";

export class OpenRouterService extends BaseService {
  constructor(config: AIServiceConfig) {
    super(config);
  }

  async chat(_request: ChatRequest): Promise<ChatResponse> {
    throw new Error("OpenRouter service not implemented");
  }

  async testConnection(): Promise<TestResult> {
    return {
      success: false,
      message: "OpenRouter service not implemented",
      details: {
        provider: this.config.provider,
        error: "Service not implemented",
      },
    };
  }
}
