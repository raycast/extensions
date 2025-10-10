/**
 * Configure Agents Command - Manage AI agent configurations
 *
 * Allows users to add, edit, and delete agent configurations,
 * set default agents, and manage built-in agent settings.
 */

import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  useNavigation
} from "@raycast/api";
import { useState, useEffect } from "react";
import { ConfigService } from "@/services/configService";
import { ErrorHandler } from "@/utils/errors";
import { createLogger } from "@/utils/logging";
import { BUILT_IN_AGENTS, checkAgentAvailability, getInstallationGuide } from "@/utils/builtInAgents";
import type { AgentConfig } from "@/types/extension";

const logger = createLogger("ConfigureAgentsCommand");

export default function ConfigureAgentsCommand() {
  const { push } = useNavigation();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [defaultAgent, setDefaultAgent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const configService = new ConfigService();

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    try {
      setIsLoading(true);
      const [agentConfigs, defaultAgentId] = await Promise.all([
        configService.getAgentConfigs(),
        configService.getDefaultAgent()
      ]);

      setAgents(agentConfigs);
      setDefaultAgent(defaultAgentId);
      logger.info("Agent configurations loaded", { count: agentConfigs.length });
    } catch (error) {
      await ErrorHandler.handleError(error, "Loading agent configurations");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteAgent(agentId: string) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    if (agent.isBuiltIn) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Delete",
        message: "Built-in agents cannot be deleted"
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
      const result = await checkAgentAvailability(agent);
      if (result.isAvailable) {
        await showToast({
          style: Toast.Style.Success,
          title: "Agent Available",
          message: `${agent.name} is ready to use`
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Agent Unavailable",
          message: result.error || "Agent command not found"
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
    const accessories = [];

    if (agent.id === defaultAgent) {
      accessories.push({ text: "Default", icon: "⭐" });
    }

    if (agent.isBuiltIn) {
      accessories.push({ text: "Built-in", icon: "🤖" });
    } else {
      accessories.push({ text: "Custom", icon: "⚙️" });
    }

    return accessories;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search agent configurations...">
      <List.EmptyView
        icon="🤖"
        title="No Agent Configurations"
        description="Add your first AI agent configuration to get started."
        actions={
          <ActionPanel>
            <Action
              title="Add Agent"
              icon="+"
              onAction={() => {
                // TODO: Navigate to add agent form
                showToast({
                  style: Toast.Style.Success,
                  title: "Feature Coming Soon",
                  message: "Add agent configuration feature is in development"
                });
              }}
            />
          </ActionPanel>
        }
      />

      {agents.map((agent) => (
        <List.Item
          key={agent.id}
          icon={agent.isBuiltIn ? "🤖" : "⚙️"}
          title={agent.name}
          subtitle={getAgentSubtitle(agent)}
          accessories={getAgentAccessories(agent)}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Agent Actions">
                <Action
                  title="Test Connection"
                  icon="🔗"
                  onAction={() => checkAvailability(agent)}
                />
                {agent.id !== defaultAgent && (
                  <Action
                    title="Set as Default"
                    icon="⭐"
                    onAction={() => setAsDefault(agent.id)}
                  />
                )}
                {!agent.isBuiltIn && (
                  <>
                    <Action
                      title="Edit Configuration"
                      icon="✏️"
                      onAction={() => {
                        // TODO: Navigate to edit agent form
                        showToast({
                          style: Toast.Style.Success,
                          title: "Feature Coming Soon",
                          message: "Edit agent configuration feature is in development"
                        });
                      }}
                    />
                    <Action
                      title="Duplicate Configuration"
                      icon="📋"
                      onAction={() => {
                        // TODO: Implement duplicate functionality
                        showToast({
                          style: Toast.Style.Success,
                          title: "Feature Coming Soon",
                          message: "Duplicate configuration feature is in development"
                        });
                      }}
                    />
                  </>
                )}
              </ActionPanel.Section>

              {agent.isBuiltIn && (
                <ActionPanel.Section title="Installation">
                  <Action
                    title="View Installation Guide"
                    icon="📖"
                    onAction={() => {
                      const guide = getInstallationGuide(agent.id);
                      if (guide) {
                        showToast({
                          style: Toast.Style.Success,
                          title: guide.name,
                          message: guide.description
                        });
                      }
                    }}
                  />
                </ActionPanel.Section>
              )}

              <ActionPanel.Section title="Management">
                <Action
                  title="Add New Agent"
                  icon="+"
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => {
                    // TODO: Navigate to add agent form
                    showToast({
                      style: Toast.Style.Success,
                      title: "Feature Coming Soon",
                      message: "Add agent configuration feature is in development"
                    });
                  }}
                />
                <Action
                  title="Refresh"
                  icon="🔄"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadAgents}
                />
                {!agent.isBuiltIn && (
                  <Action
                    title="Delete Configuration"
                    icon="🗑"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    onAction={() => deleteAgent(agent.id)}
                  />
                )}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}