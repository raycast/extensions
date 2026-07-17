import { AIServiceConfig, AIProvider } from "../utils/types";

export const AI_SERVICES: AIServiceConfig[] = [
  {
    provider: "raycast",
    models: [
      {
        id: "openai-gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "raycast",
        enabled: true,
        contextWindow: 8192,
        maxTokens: 4096,
        pricing: { input: 0.01, output: 0.03 },
        capabilities: {
          chat: true,
          completion: true,
          translation: true,
        },
      },
    ],
  },
];

export function getModelProvider(modelId: string): AIProvider {
  for (const service of AI_SERVICES) {
    const model = service.models.find((m) => m.id === modelId);
    if (model) {
      return model.provider;
    }
  }
  throw new Error(`Unknown model: ${modelId}`);
}
