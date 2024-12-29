import { BaseService } from "./baseService";
import { RaycastService } from "./raycast";
import { AI_SERVICES } from "../config/aiConfig";
import {
  AIProvider,
  AIServiceConfig,
  AIModelConfig,
  ServiceStatus,
  ServiceLog,
  TestResult,
} from "../utils/types";

class AIManager {
  private static instance: AIManager;
  private services: Map<AIProvider, BaseService> = new Map();
  private modelConfigs: Map<string, AIModelConfig> = new Map();
  private logs: ServiceLog[] = [];

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
    AI_SERVICES.forEach(config => {
      // 注册服务
      this.registerService(config);
      // 缓存模型配置
      config.models.forEach(model => {
        this.modelConfigs.set(model.id, model);
      });
    });
  }

  private registerService(config: AIServiceConfig) {
    let service: BaseService;

    switch (config.provider) {
      case "raycast":
        service = new RaycastService(config);
        break;
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }

    this.services.set(config.provider, service);
  }

  public getService(provider: AIProvider): BaseService {
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
    return this.getAllModels().filter(model => model.enabled);
  }

  public getModelsByProvider(provider: AIProvider): AIModelConfig[] {
    return this.getAllModels().filter(model => model.provider === provider);
  }

  public getServicesStatus(): Record<AIProvider, ServiceStatus> {
    const status: Record<AIProvider, ServiceStatus> = {} as Record<
      AIProvider,
      ServiceStatus
    >;
    this.services.forEach((service, provider) => {
      status[provider] = service.getStatus();
    });
    return status;
  }

  public getAllLogs(): ServiceLog[] {
    return [...this.logs].sort((a, b) => b.timestamp - a.timestamp);
  }

  public logServiceCall(log: ServiceLog) {
    this.logs.push(log);
    const service = this.services.get(log.provider);
    if (service) {
      service.logRequest(log);
    }
  }

  public async testConnection(
    provider: AIProvider,
    debug: boolean = false
  ): Promise<TestResult> {
    const service = this.getService(provider);
    return await service.testConnection(debug);
  }

  public async testAllConnections(
    debug: boolean = false
  ): Promise<Record<AIProvider, TestResult>> {
    const results: Record<AIProvider, TestResult> = {} as Record<
      AIProvider,
      TestResult
    >;
    for (const provider of this.services.keys()) {
      results[provider] = await this.testConnection(provider, debug);
    }
    return results;
  }
}

export const aiManager = AIManager.getInstance();
