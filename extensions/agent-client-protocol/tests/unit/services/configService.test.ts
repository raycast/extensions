/**
 * Unit Tests for ConfigService
 *
 * Verifies agent configuration persistence including:
 * - Loading default built-in agents
 * - Allowing customization of built-in agents
 * - Adding new custom agent configurations
 */

import { ConfigService } from "@/services/configService";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import type { AgentConfig } from "@/types/extension";
import { LocalStorage } from "@raycast/api";

jest.mock("@raycast/api");

const mockLocalStorage = jest.mocked(LocalStorage);

describe("ConfigService - Agent Configurations", () => {
  let service: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConfigService();
  });

  function mockStoredAgents(agents: AgentConfig[] | null) {
    mockLocalStorage.getItem.mockImplementation(async (key: string) => {
      if (key === STORAGE_KEYS.AGENT_CONFIGS) {
        return agents ? JSON.stringify(agents) : null;
      }
      return null;
    });
  }

  it("returns built-in agents when storage is empty", async () => {
    mockStoredAgents(null);

    const agents = await service.getAgentConfigs();

    expect(agents.length).toBeGreaterThan(0);
    expect(agents.some((agent) => agent.id === "gemini-cli")).toBe(true);
  });

  it("allows editing a built-in agent configuration", async () => {
    mockStoredAgents(null);

    const agents = await service.getAgentConfigs();
    const gemini = agents.find((agent) => agent.id === "gemini-cli");
    expect(gemini).toBeDefined();

    const updated = {
      ...gemini!,
      command: "/usr/local/bin/gemini",
      args: ["--acp", "--verbose"],
      appendToPath: ["/opt/homebrew/bin"],
    };

    await service.saveAgentConfig(updated);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.AGENT_CONFIGS,
      expect.stringContaining("/usr/local/bin/gemini")
    );
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.AGENT_CONFIGS,
      expect.stringContaining("/opt/homebrew/bin")
    );
  });

  it("persists new custom agent configurations alongside built-ins", async () => {
    mockStoredAgents(null);

    const newAgent: AgentConfig = {
      id: "custom-agent",
      name: "Custom Agent",
      type: "remote",
      endpoint: "ws://localhost:8080/acp",
      isBuiltIn: false,
      description: "Test custom agent",
      createdAt: new Date("2025-01-02"),
    };

    await service.saveAgentConfig(newAgent);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.AGENT_CONFIGS,
      expect.stringContaining("custom-agent")
    );
  });

  it("retains appendToPath entries when loading configurations", async () => {
    const storedAgent: AgentConfig = {
      id: "custom-agent",
      name: "Custom Agent",
      type: "subprocess",
      command: "/usr/bin/custom",
      args: ["--flag"],
      appendToPath: ["/opt/homebrew/bin", "/usr/local/bin"],
      createdAt: new Date("2025-01-02"),
      isBuiltIn: false,
    };

    mockStoredAgents([storedAgent]);

    const agents = await service.getAgentConfigs();
    const custom = agents.find((agent) => agent.id === "custom-agent");

    expect(custom?.appendToPath).toEqual(["/opt/homebrew/bin", "/usr/local/bin"]);
  });
});
