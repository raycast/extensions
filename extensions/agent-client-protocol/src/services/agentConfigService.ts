import type { AgentConfig, AgentHealthRecord } from "@/types/extension";
import { ConfigService } from "@/services/configService";
import { HealthService } from "@/services/healthService";
import { generateAgentId, getAgentTemplate, validateAgentConfig, checkAgentAvailability } from "@/utils/builtInAgents";

export interface AgentConfigServiceDependencies {
  configService?: ConfigService;
  healthService?: HealthService;
}

export type CreateAgentInput = {
  name: string;
  type: AgentConfig["type"];
  command?: string;
  args?: string[];
  endpoint?: string;
  workingDirectory?: string;
  description?: string;
  environmentVariables?: Record<string, string>;
  appendToPath?: string[];
};

export class AgentConfigService {
  private readonly configService: ConfigService;
  private readonly healthService: HealthService;

  constructor(dependencies: AgentConfigServiceDependencies = {}) {
    this.configService = dependencies.configService ?? new ConfigService();
    this.healthService = dependencies.healthService ?? new HealthService();
  }

  async listAgents(): Promise<AgentConfig[]> {
    return this.configService.getAgentConfigs();
  }

  async createAgent(input: CreateAgentInput): Promise<AgentConfig> {
    const id = generateAgentId(input.name);
    const createdAt = new Date(Date.now());

    const trimmedArgs = input.args?.map((arg) => arg.trim()).filter((arg) => arg.length > 0);

    const config: AgentConfig = {
      id,
      name: input.name.trim(),
      type: input.type,
      command: input.type === "subprocess" ? input.command?.trim() : undefined,
      args: input.type === "subprocess" && trimmedArgs && trimmedArgs.length > 0 ? [...trimmedArgs] : undefined,
      endpoint: input.type === "remote" ? input.endpoint?.trim() : undefined,
      workingDirectory: input.type === "subprocess" ? input.workingDirectory?.trim() : undefined,
      environmentVariables: input.environmentVariables ? { ...input.environmentVariables } : undefined,
      appendToPath: input.appendToPath ? [...input.appendToPath] : undefined,
      description: input.description?.trim() || undefined,
      isBuiltIn: false,
      createdAt,
      lastUsed: undefined,
    };

    const validation = validateAgentConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid agent configuration: ${validation.errors.join(", ")}`);
    }

    await this.configService.saveAgentConfig(config);
    return config;
  }

  async duplicateAgent(agentId: string): Promise<AgentConfig> {
    const agents = await this.configService.getAgentConfigs();
    const source = agents.find((agent) => agent.id === agentId);

    if (!source) {
      throw new Error(`Agent configuration not found: ${agentId}`);
    }

    const copyName = `${source.name} (Copy)`;
    const id = generateAgentId(copyName);

    const duplicateArgs = source.args && source.args.length > 0 ? [...source.args] : undefined;
    const duplicateAppendToPath =
      source.appendToPath && source.appendToPath.length > 0 ? [...source.appendToPath] : undefined;
    const duplicateEnv = source.environmentVariables ? { ...source.environmentVariables } : undefined;

    const duplicate: AgentConfig = {
      id,
      name: copyName,
      type: source.type,
      command: source.type === "subprocess" ? source.command : undefined,
      args: source.type === "subprocess" ? duplicateArgs : undefined,
      workingDirectory: source.type === "subprocess" ? source.workingDirectory : undefined,
      endpoint: source.type === "remote" ? source.endpoint : undefined,
      environmentVariables: duplicateEnv,
      appendToPath: source.type === "subprocess" ? duplicateAppendToPath : undefined,
      description: source.description,
      isBuiltIn: false,
      createdAt: new Date(Date.now()),
      lastUsed: undefined,
    };

    await this.configService.saveAgentConfig(duplicate);
    return duplicate;
  }

  async createAgentFromTemplate(templateName: string, overrides: Partial<CreateAgentInput>): Promise<AgentConfig> {
    const template = getAgentTemplate(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const name = overrides.name ?? template.name ?? templateName;
    const type = overrides.type ?? template.type ?? "subprocess";
    const id = generateAgentId(name);

    const argsCandidate = type === "subprocess" ? (overrides.args ?? template.args ?? undefined) : undefined;

    const appendCandidate = overrides.appendToPath ?? template.appendToPath ?? undefined;
    const envCandidate = overrides.environmentVariables ?? template.environmentVariables ?? undefined;

    const config: AgentConfig = {
      id,
      name,
      type,
      command: type === "subprocess" ? (overrides.command ?? template.command ?? undefined) : undefined,
      args: type === "subprocess" && argsCandidate && argsCandidate.length > 0 ? [...argsCandidate] : undefined,
      endpoint: type === "remote" ? (overrides.endpoint ?? template.endpoint ?? undefined) : undefined,
      workingDirectory:
        type === "subprocess" ? (overrides.workingDirectory ?? template.workingDirectory ?? undefined) : undefined,
      environmentVariables: envCandidate ? { ...envCandidate } : undefined,
      appendToPath: appendCandidate && appendCandidate.length > 0 ? [...appendCandidate] : undefined,
      description: overrides.description ?? template.description,
      isBuiltIn: false,
      createdAt: new Date(Date.now()),
      lastUsed: undefined,
    };

    const validation = validateAgentConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid agent configuration: ${validation.errors.join(", ")}`);
    }

    await this.configService.saveAgentConfig(config);
    return config;
  }

  async testAgentConnection(agentId: string): Promise<AgentHealthRecord> {
    const agents = await this.configService.getAgentConfigs();
    const agent = agents.find((item) => item.id === agentId);

    if (!agent) {
      throw new Error(`Agent configuration not found: ${agentId}`);
    }

    const result = await checkAgentAvailability(agent);

    if (result.isAvailable) {
      return this.healthService.recordSuccess(agentId, result.latencyMs);
    }

    const error = result.error ?? "Agent unavailable";
    return this.healthService.recordFailure(agentId, error);
  }

  async exportConfigurations(): Promise<string> {
    return this.configService.exportData();
  }

  async importConfigurations(payload: string): Promise<void> {
    await this.configService.importData(payload);
  }

  async getAgentHealth(agentId: string): Promise<AgentHealthRecord | null> {
    return this.healthService.get(agentId);
  }

  async getAllAgentHealth(): Promise<AgentHealthRecord[]> {
    return this.healthService.getAll();
  }
}
