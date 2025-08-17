import { RaycastService } from "./raycast";
import { AI_SERVICES } from "../config/aiConfig";
import { AIProvider, AIServiceConfig, AIModelConfig, TestResult } from "../utils/types";

class AIManager {
  private static instance: AIManager;
  private services: Map<AIProvider, RaycastService> = new Map();
  private modelConfigs: Map<string, AIModelConfig> = new Map();

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): AIManager {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
    }
    return AIManager.instance;
  }

  private initializeServices() {
    AI_SERVICES.forEach((config) => {
      // Register service
      this.registerService(config);
      // Cache model configuration
      config.models.forEach((model) => {
        this.modelConfigs.set(model.id, model);
      });
    });
  }

  private registerService(config: AIServiceConfig) {
    if (config.provider === "raycast") {
      const service = new RaycastService({ provider: config.provider });
      this.services.set(config.provider, service);
    } else {
      throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  public getService(provider: AIProvider): RaycastService {
    const service = this.services.get(provider);
    if (!service) {
      throw new Error(`Service not found for provider: ${provider}`);
    }
    return service;
  }

  public getModelConfig(modelId: string): AIModelConfig | undefined {
    return this.modelConfigs.get(modelId);
  }

  public getAllModels(): AIModelConfig[] {
    return Array.from(this.modelConfigs.values());
  }

  public getEnabledModels(): AIModelConfig[] {
    return this.getAllModels().filter((model) => model.enabled);
  }

  public getModelsByProvider(provider: AIProvider): AIModelConfig[] {
    return this.getAllModels().filter((model) => model.provider === provider);
  }

  public async testConnection(provider: AIProvider, debug: boolean = false): Promise<TestResult> {
    const service = this.getService(provider);
    return service.testConnection(debug);
  }

  public async testAllConnections(debug: boolean = false): Promise<Record<AIProvider, TestResult>> {
    const results: Record<AIProvider, TestResult> = {} as Record<AIProvider, TestResult>;
    for (const [provider, service] of this.services) {
      results[provider] = await service.testConnection(debug);
    }
    return results;
  }
}

export const aiManager = AIManager.getInstance();
