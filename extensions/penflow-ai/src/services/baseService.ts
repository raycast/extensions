import { AIServiceConfig, ChatRequest, ChatResponse, ServiceLog, TestResult } from "../utils/types";

export abstract class BaseService {
  protected config: AIServiceConfig;
  protected logs: ServiceLog[] = [];

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  abstract chat(request: ChatRequest): Promise<ChatResponse>;

  abstract testConnection(debug?: boolean): Promise<TestResult>;

  public getModels() {
    return this.config.models.filter((model) => model.enabled);
  }

  protected validateModel(modelId: string) {
    const model = this.config.models.find((m) => m.id === modelId);
    if (!model || !model.enabled) {
      throw new Error(`Model ${modelId} is not available`);
    }
    return model;
  }

  public getLogs(): ServiceLog[] {
    return [...this.logs];
  }

  protected logRequest(input: string, output?: string, error?: string) {
    const log: ServiceLog = {
      timestamp: Date.now(),
      provider: this.config.provider,
      model: this.config.models[0].id,
      input,
      output,
      error,
    };
    this.logs.push(log);
  }
}
