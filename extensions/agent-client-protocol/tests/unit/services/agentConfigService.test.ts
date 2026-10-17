import type { AgentConfig } from "@/types/extension";
import { AgentConfigService } from "@/services/agentConfigService";
import { ConfigService } from "@/services/configService";
import { HealthService, type AgentHealthRecord } from "@/services/healthService";
import { generateAgentId, checkAgentAvailability } from "@/utils/builtInAgents";

jest.mock("@/services/configService");
jest.mock("@/services/healthService");
jest.mock("@/utils/builtInAgents", () => ({
  ...jest.requireActual("@/utils/builtInAgents"),
  generateAgentId: jest.fn(),
  checkAgentAvailability: jest.fn()
}));

const mockGenerateAgentId = jest.mocked(generateAgentId);
const mockCheckAgentAvailability = jest.mocked(checkAgentAvailability);

function createAgent(partial: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: partial.id ?? "agent-1",
    name: partial.name ?? "Example Agent",
    type: partial.type ?? "subprocess",
    command: partial.command ?? "example",
    args: partial.args,
    workingDirectory: partial.workingDirectory,
    endpoint: partial.endpoint,
    environmentVariables: partial.environmentVariables,
    appendToPath: partial.appendToPath,
    description: partial.description,
    isBuiltIn: partial.isBuiltIn ?? false,
    createdAt: partial.createdAt ?? new Date("2025-01-02T00:00:00Z"),
    lastUsed: partial.lastUsed
  };
}

describe("AgentConfigService", () => {
  let configService: jest.Mocked<ConfigService>;
  let healthService: jest.Mocked<HealthService>;
  let service: AgentConfigService;

  beforeEach(() => {
    jest.resetAllMocks();

    configService = new ConfigService() as jest.Mocked<ConfigService>;
    healthService = new HealthService() as jest.Mocked<HealthService>;

    configService.getAgentConfigs.mockResolvedValue([createAgent()]);
    configService.saveAgentConfig.mockResolvedValue();
    configService.deleteAgentConfig.mockResolvedValue();
    configService.setDefaultAgent.mockResolvedValue();
    configService.getDefaultAgent.mockResolvedValue("agent-1");
    configService.exportData.mockResolvedValue("{\"agents\":[]}");
    configService.importData.mockResolvedValue();

    healthService.recordSuccess.mockImplementation(async (agentId, latencyMs) => ({
      agentId,
      status: "healthy",
      lastChecked: new Date("2025-02-01T12:00:00Z"),
      latencyMs
    } as AgentHealthRecord));
    healthService.recordFailure.mockImplementation(async (agentId, error) => ({
      agentId,
      status: "unhealthy",
      lastChecked: new Date("2025-02-01T12:05:00Z"),
      error
    } as AgentHealthRecord));

    mockGenerateAgentId.mockImplementation((name: string) => `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`);

    service = new AgentConfigService({ configService, healthService });
  });

  it("creates a new agent configuration with generated id", async () => {
    mockGenerateAgentId.mockReturnValue("my-agent-123");

    const result = await service.createAgent({
      name: "My Agent",
      type: "subprocess",
      command: "my-agent",
      args: ["--flag"]
    });

    expect(configService.saveAgentConfig).toHaveBeenCalledWith(expect.objectContaining({
      id: "my-agent-123",
      name: "My Agent",
      type: "subprocess",
      command: "my-agent",
      args: ["--flag"],
      isBuiltIn: false
    }));

    expect(result.id).toBe("my-agent-123");
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.lastUsed).toBeUndefined();
  });

  it("duplicates an existing agent configuration with copy suffix", async () => {
    const existing = createAgent({
      id: "agent-dup",
      name: "Duplicate Me",
      command: "dup",
      args: ["--alpha"],
      appendToPath: ["/opt/bin"],
      environmentVariables: { FOO: "bar" }
    });

    configService.getAgentConfigs.mockResolvedValue([existing]);
    mockGenerateAgentId.mockReturnValue("duplicate-me-copy-1");

    const duplicate = await service.duplicateAgent("agent-dup");

    expect(configService.saveAgentConfig).toHaveBeenCalledWith(expect.objectContaining({
      id: "duplicate-me-copy-1",
      name: "Duplicate Me (Copy)",
      command: "dup",
      args: ["--alpha"],
      appendToPath: ["/opt/bin"],
      environmentVariables: { FOO: "bar" }
    }));

    expect(duplicate.id).toBe("duplicate-me-copy-1");
    expect(duplicate.name).toBe("Duplicate Me (Copy)");
    expect(duplicate.isBuiltIn).toBe(false);
  });

  it("creates an agent from template with overrides", async () => {
    mockGenerateAgentId.mockReturnValue("custom-local-agent-1");

    const agent = await service.createAgentFromTemplate("Custom Local Agent", {
      name: "Project Agent",
      command: "node",
      args: ["agent.ts"],
      workingDirectory: "/projects/repo"
    });

    expect(agent.name).toBe("Project Agent");
    expect(agent.command).toBe("node");
    expect(agent.workingDirectory).toBe("/projects/repo");
    expect(agent.isBuiltIn).toBe(false);
    expect(configService.saveAgentConfig).toHaveBeenCalled();
  });

  it("throws when creating from unknown template", async () => {
    await expect(
      service.createAgentFromTemplate("Missing Template", { name: "X" })
    ).rejects.toThrow("Template not found: Missing Template");
  });

  it("tests agent connection and records healthy status", async () => {
    const agent = createAgent({ id: "agent-health", name: "Health Agent", command: "health" });
    configService.getAgentConfigs.mockResolvedValue([agent]);
    mockCheckAgentAvailability.mockResolvedValue({ isAvailable: true, latencyMs: 120 });

    const result = await service.testAgentConnection("agent-health");

    expect(mockCheckAgentAvailability).toHaveBeenCalledWith(agent);
    expect(healthService.recordSuccess).toHaveBeenCalledWith("agent-health", 120);
    expect(result.status).toBe("healthy");
    expect(result.latencyMs).toBe(120);
  });

  it("tests agent connection and records failure when unavailable", async () => {
    const agent = createAgent({ id: "agent-fail", name: "Fail Agent", command: "fail" });
    configService.getAgentConfigs.mockResolvedValue([agent]);
    mockCheckAgentAvailability.mockResolvedValue({ isAvailable: false, error: "Command not found" });

    const result = await service.testAgentConnection("agent-fail");

    expect(healthService.recordFailure).toHaveBeenCalledWith("agent-fail", "Command not found");
    expect(result.status).toBe("unhealthy");
    expect(result.error).toBe("Command not found");
  });

  it("throws when testing connection for unknown agent", async () => {
    configService.getAgentConfigs.mockResolvedValue([]);

    await expect(service.testAgentConnection("missing-agent")).rejects.toThrow("Agent configuration not found: missing-agent");
  });

  it("exports configurations using config service", async () => {
    configService.exportData.mockResolvedValue("export-payload");

    const payload = await service.exportConfigurations();

    expect(configService.exportData).toHaveBeenCalled();
    expect(payload).toBe("export-payload");
  });

  it("imports configurations using config service", async () => {
    await service.importConfigurations("{\"agents\":[]}");

    expect(configService.importData).toHaveBeenCalledWith("{\"agents\":[]}");
  });
});
