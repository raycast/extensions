/**
 * Configure Agents Command - Manage AI agent configurations
 *
 * Allows users to add, edit, and delete agent configurations,
 * set default agents, and manage built-in agent settings.
 */

import { Action, ActionPanel, List, showToast, Toast, confirmAlert, Alert, Icon, Clipboard } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { ConfigService } from "@/services/configService";
import { AgentConfigService } from "@/services/agentConfigService";
import { ErrorHandler } from "@/utils/errors";
import { createLogger } from "@/utils/logging";
import { getInstallationGuide, AGENT_TEMPLATES } from "@/utils/builtInAgents";
import type { AgentConfig, AgentHealthRecord } from "@/types/extension";
import { AddAgentForm, EditAgentForm } from "@/components/AgentConfig";
import { getAgentHealthAccessory } from "@/components/AgentSelector";

const logger = createLogger("ConfigureAgentsCommand");

export default function ConfigureAgentsCommand() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [defaultAgent, setDefaultAgent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [healthMap, setHealthMap] = useState<Record<string, AgentHealthRecord>>({});

  const configService = useMemo(() => new ConfigService(), []);
  const agentConfigService = useMemo(() => new AgentConfigService(), []);

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    try {
      setIsLoading(true);
      const [agentConfigs, defaultAgentId, healthRecords] = await Promise.all([
        configService.getAgentConfigs(),
        configService.getDefaultAgent(),
        agentConfigService.getAllAgentHealth().catch((error) => {
          logger.warn("Failed to load agent health records", { error });
          return [] as AgentHealthRecord[];
        }),
      ]);

      setAgents(agentConfigs);
      setDefaultAgent(defaultAgentId);
      const healthByAgent = Object.fromEntries(healthRecords.map((record) => [record.agentId, record] as const));
      setHealthMap(healthByAgent);
      logger.info("Agent configurations loaded", { count: agentConfigs.length });
    } catch (error) {
      await ErrorHandler.handleError(error, "Loading agent configurations");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteAgent(agentId: string) {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    if (agent.isBuiltIn) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Delete",
        message: "Built-in agents cannot be deleted",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Delete Agent Configuration",
      message: `Are you sure you want to delete "${agent.name}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await configService.deleteAgentConfig(agentId);
        await loadAgents(); // Refresh the list
        await ErrorHandler.showSuccess("Agent configuration deleted");
      } catch (error) {
        await ErrorHandler.handleError(error, "Deleting agent configuration");
      }
    }
  }

  async function duplicateAgentConfiguration(agentId: string) {
    try {
      const duplicate = await agentConfigService.duplicateAgent(agentId);
      await loadAgents();
      await showToast({
        style: Toast.Style.Success,
        title: "Agent Duplicated",
        message: `${duplicate.name} created`,
      });
    } catch (error) {
      await ErrorHandler.handleError(error, "Duplicating agent configuration");
    }
  }

  async function createFromTemplate(templateName: string) {
    try {
      const created = await agentConfigService.createAgentFromTemplate(templateName, {});
      await loadAgents();
      await showToast({
        style: Toast.Style.Success,
        title: "Template Added",
        message: `${created.name} ready to configure`,
      });
    } catch (error) {
      await ErrorHandler.handleError(error, "Creating agent from template");
    }
  }

  async function exportConfigurationsToClipboard() {
    try {
      const payload = await agentConfigService.exportConfigurations();
      await Clipboard.copy(payload);
      await showToast({
        style: Toast.Style.Success,
        title: "Configurations Copied",
        message: "Agent configurations copied to clipboard",
      });
    } catch (error) {
      await ErrorHandler.handleError(error, "Exporting agent configurations");
    }
  }

  async function importConfigurationsFromClipboard() {
    try {
      const clipboard = await Clipboard.read();
      if (!clipboard.text) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Clipboard Empty",
          message: "Copy exported agent configurations before importing",
        });
        return;
      }

      await agentConfigService.importConfigurations(clipboard.text);
      await loadAgents();
      await showToast({
        style: Toast.Style.Success,
        title: "Configurations Imported",
      });
    } catch (error) {
      await ErrorHandler.handleError(error, "Importing agent configurations");
    }
  }

  async function setAsDefault(agentId: string) {
    try {
      await configService.setDefaultAgent(agentId);
      setDefaultAgent(agentId);
      await ErrorHandler.showSuccess("Default agent updated");
    } catch (error) {
      await ErrorHandler.handleError(error, "Setting default agent");
    }
  }

  async function checkAvailability(agent: AgentConfig) {
    try {
      const record = await agentConfigService.testAgentConnection(agent.id);
      setHealthMap((existing) => ({ ...existing, [agent.id]: record }));

      if (record.status === "healthy") {
        const latencyText = typeof record.latencyMs === "number" ? `${record.latencyMs} ms` : undefined;
        await showToast({
          style: Toast.Style.Success,
          title: "Agent Available",
          message: latencyText ? `${agent.name} • ${latencyText}` : `${agent.name} is ready to use`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Agent Unavailable",
          message: record.error ?? "Agent command not found",
        });
      }
    } catch (error) {
      await ErrorHandler.handleError(error, "Checking agent availability");
    }
  }

  function getAgentSubtitle(agent: AgentConfig): string {
    const parts: string[] = [];

    if (agent.isBuiltIn) {
      parts.push("Built-in");
    }

    if (agent.type === "subprocess") {
      parts.push(`Command: ${agent.command}`);
    } else if (agent.type === "remote") {
      parts.push(`Remote: ${agent.endpoint}`);
    }

    if (agent.lastUsed) {
      parts.push(`Last used: ${agent.lastUsed.toLocaleDateString()}`);
    }

    return parts.join(" • ");
  }

  function getAgentAccessories(agent: AgentConfig) {
    const accessories: List.Item.Accessory[] = [];

    if (agent.id === defaultAgent) {
      accessories.push({ text: "Default", icon: Icon.Star });
    }

    if (agent.isBuiltIn) {
      accessories.push({ text: "Built-in", icon: Icon.ComputerChip });
    } else {
      accessories.push({ text: "Custom", icon: Icon.Gear });
    }

    const health = healthMap[agent.id];
    const healthAccessory = getAgentHealthAccessory(health);
    if (healthAccessory) {
      accessories.push(healthAccessory);
    }

    return accessories;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search agent configurations...">
      <List.EmptyView
        icon={Icon.ComputerChip}
        title="No Agent Configurations"
        description="Add your first AI agent configuration to get started."
        actions={
          <ActionPanel>
            <Action.Push title="Add Agent" icon={Icon.Plus} target={<AddAgentForm onSave={loadAgents} />} />
          </ActionPanel>
        }
      />

      {agents.map((agent) => (
        <List.Item
          key={agent.id}
          icon={agent.isBuiltIn ? Icon.ComputerChip : Icon.Gear}
          title={agent.name}
          subtitle={getAgentSubtitle(agent)}
          accessories={getAgentAccessories(agent)}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Agent Actions">
                <Action title="Test Connection" icon={Icon.Link} onAction={() => checkAvailability(agent)} />
                <Action.Push
                  title="Edit Configuration"
                  icon={Icon.Pencil}
                  target={<EditAgentForm existingConfig={agent} onSave={loadAgents} />}
                />
                {agent.id !== defaultAgent && (
                  <Action title="Set as Default" icon={Icon.Star} onAction={() => setAsDefault(agent.id)} />
                )}
                {!agent.isBuiltIn && (
                  <Action
                    title="Duplicate Configuration"
                    icon={Icon.Document}
                    onAction={() => duplicateAgentConfiguration(agent.id)}
                  />
                )}
              </ActionPanel.Section>

              {agent.isBuiltIn && (
                <ActionPanel.Section title="Installation">
                  <Action
                    title="View Installation Guide"
                    icon={Icon.Book}
                    onAction={() => {
                      const guide = getInstallationGuide(agent.id);
                      if (guide) {
                        showToast({
                          style: Toast.Style.Success,
                          title: guide.name,
                          message: guide.description,
                        });
                      }
                    }}
                  />
                </ActionPanel.Section>
              )}

              <ActionPanel.Section title="Management">
                <Action.Push
                  title="Add New Agent"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<AddAgentForm onSave={loadAgents} />}
                />
                <ActionPanel.Submenu title="Add from Template" icon={Icon.TextDocument}>
                  {AGENT_TEMPLATES.filter((template) => Boolean(template.name)).map((template) => (
                    <Action
                      key={template.name}
                      title={template.name ?? "Template"}
                      onAction={() => createFromTemplate(template.name ?? "")}
                    />
                  ))}
                </ActionPanel.Submenu>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadAgents}
                />
                {!agent.isBuiltIn && (
                  <Action
                    title="Delete Configuration"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    onAction={() => deleteAgent(agent.id)}
                  />
                )}
              </ActionPanel.Section>

              <ActionPanel.Section title="Templates & Data">
                <Action
                  title="Export Configurations to Clipboard"
                  icon={Icon.Download}
                  onAction={exportConfigurationsToClipboard}
                />
                <Action
                  title="Import Configurations from Clipboard"
                  icon={Icon.Upload}
                  onAction={importConfigurationsFromClipboard}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
