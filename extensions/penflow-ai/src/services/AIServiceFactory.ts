import { AIServiceConfig } from "../utils/types";
import { RaycastService } from "./raycast";
import { OpenAIService } from "./openai";

export class AIServiceFactory {
  static createService(config: AIServiceConfig) {
    switch (config.provider) {
      case "raycast":
        return new RaycastService(config);
      case "openai":
        return new OpenAIService(config);
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }
}
