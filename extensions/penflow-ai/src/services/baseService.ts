import {
  AIServiceConfig,
  ChatRequest,
  ChatResponse,
  ServiceLog,
  ServiceStatus,
  TestResult,
} from "../utils/types";

export abstract class BaseService {
  protected config: AIServiceConfig;
  protected logs: ServiceLog[] = [];
  protected status: ServiceStatus;

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.status = {
      provider: config.provider,
      isAvailable: true,
      activeModels: config.models.filter(m => m.enabled).map(m => m.id),
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      lastChecked: new Date(),
    };
  }

  abstract chat(request: ChatRequest): Promise<ChatResponse>;

  abstract testConnection(debug?: boolean): Promise<TestResult>;

  public getModels() {
    return this.config.models.filter(model => model.enabled);
  }

  protected validateModel(modelId: string) {
    const model = this.config.models.find(m => m.id === modelId);
    if (!model || !model.enabled) {
      throw new Error(`Model ${modelId} is not available`);
    }
    return model;
  }

  public getStatus(): ServiceStatus {
    return { ...this.status };
  }

  public getLogs(): ServiceLog[] {
    return [...this.logs];
  }

  public logRequest(log: ServiceLog) {
    this.logs.push(log);
    if (log.success) {
      this.status.successfulRequests++;
      if (log.usage) {
        this.status.totalTokensUsed += log.usage.totalTokens;
      }
    } else {
      this.status.failedRequests++;
    }
  }
}
