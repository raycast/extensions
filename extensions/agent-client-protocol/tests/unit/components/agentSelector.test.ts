jest.mock("@raycast/api", () => {
  const noop = () => null;
  const List = Object.assign(noop, {
    Item: Object.assign(noop, { Detail: { Metadata: noop } }),
    Section: noop,
    EmptyView: noop
  });

  return {
    Icon: {
      Checkmark: "check-icon",
      XMarkCircle: "x-icon",
      ComputerChip: "chip-icon",
      Gear: "gear-icon",
      Link: "link-icon",
      Download: "download-icon",
      Upload: "upload-icon",
      TextDocument: "template-icon",
      ArrowClockwise: "refresh-icon",
      Plus: "plus-icon",
      Pencil: "pencil-icon",
      Star: "star-icon",
      Book: "book-icon",
      Trash: "trash-icon"
    },
    Color: {
      Green: "green",
      Red: "red"
    },
    List,
    ActionPanel: Object.assign(noop, { Section: noop, Submenu: noop }),
    Action: Object.assign(noop, { Panel: noop }),
    useNavigation: () => ({ pop: noop })
  };
});

import type { AgentConfig } from "@/types/extension";
import type { AgentHealthRecord } from "@/types/extension";
import { getAgentSubtitle, getAgentHealthAccessory } from "@/components/AgentSelector";

function createAgent(partial: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: partial.id ?? "agent-1",
    name: partial.name ?? "Example Agent",
    type: partial.type ?? "subprocess",
    command: partial.command ?? "agent",
    args: partial.args,
    workingDirectory: partial.workingDirectory,
    endpoint: partial.endpoint,
    description: partial.description,
    isBuiltIn: partial.isBuiltIn ?? false,
    createdAt: partial.createdAt ?? new Date("2025-01-02T00:00:00Z"),
    lastUsed: partial.lastUsed,
    environmentVariables: partial.environmentVariables,
    appendToPath: partial.appendToPath
  };
}

describe("AgentSelector helpers", () => {
  it("builds subtitle for subprocess agent with command and working directory", () => {
    const subtitle = getAgentSubtitle(createAgent({ command: "node", args: ["agent.ts"], workingDirectory: "/repo" }));
    expect(subtitle).toBe("Command: node agent.ts • CWD: /repo");
  });

  it("builds subtitle for remote agent with endpoint", () => {
    const subtitle = getAgentSubtitle(createAgent({
      type: "remote",
      command: undefined,
      endpoint: "wss://example.com/acp"
    }));
    expect(subtitle).toBe("Remote: wss://example.com/acp");
  });

  it("returns healthy accessory when agent is healthy", () => {
    const health: AgentHealthRecord = {
      agentId: "agent-1",
      status: "healthy",
      lastChecked: new Date("2025-02-01T12:00:00Z"),
      latencyMs: 150
    };

    const accessory = getAgentHealthAccessory(health);
    expect(accessory?.text).toBe("Healthy");
    expect(accessory?.icon).toBeDefined();
    expect(accessory?.tooltip).toContain("150 ms");
  });

  it("returns unhealthy accessory with error message", () => {
    const health: AgentHealthRecord = {
      agentId: "agent-1",
      status: "unhealthy",
      lastChecked: new Date("2025-02-01T12:00:00Z"),
      error: "Command not found"
    };

    const accessory = getAgentHealthAccessory(health);
    expect(accessory?.text).toBe("Unhealthy");
    expect(accessory?.tooltip).toContain("Command not found");
  });

  it("returns undefined accessory when no health record", () => {
    expect(getAgentHealthAccessory(undefined)).toBeUndefined();
  });
});
