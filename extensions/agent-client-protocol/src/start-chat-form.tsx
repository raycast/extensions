/**
 * Start Chat Form - Initial configuration before starting a conversation
 *
 * Provides a form to configure agent, working directory, and other settings
 * before launching the chat interface.
 */

import { Action, ActionPanel, Form, Icon, showToast, Toast, LocalStorage, open } from "@raycast/api";
import { useState, useEffect } from "react";
import { ConfigService } from "@/services/configService";
import { ErrorHandler } from "@/utils/errors";
import { createLogger } from "@/utils/logging";
import type { AgentConfig } from "@/types/extension";
import ChatCommand from "@/chat";
import { useNavigation } from "@raycast/api";
import { STORAGE_KEYS } from "@/utils/storageKeys";

const logger = createLogger("StartChatForm");

const FAVORITES_KEY = "chat_favorites";
const RECENT_CWD_KEY = "recent_working_directories";

interface ChatFavorite {
  id: string;
  name: string;
  agentId: string;
  workingDirectory?: string;
  createdAt: Date;
}

interface LastChatConfig {
  agentId: string;
  workingDirectory?: string;
  timestamp: string;
}

interface FormValues {
  agentId: string;
  workingDirectory: string;
  favoriteId?: string;
  saveFavorite: boolean;
  favoriteName?: string;
}

export default function StartChatForm() {
  const { push } = useNavigation();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [favorites, setFavorites] = useState<ChatFavorite[]>([]);
  const [recentDirectories, setRecentDirectories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string>("");
  const [workingDirectory, setWorkingDirectory] = useState<string>("");
  const [shouldSaveFavorite, setShouldSaveFavorite] = useState(false);

  const configService = new ConfigService();

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setIsLoading(true);
      const [agentConfigs, defaultAgentId, savedFavorites, recentDirs, lastChatConfig] = await Promise.all([
        configService.getAgentConfigs(),
        configService.getDefaultAgent(),
        loadFavorites(),
        loadRecentDirectories(),
        loadLastChatConfig(),
      ]);

      setAgents(agentConfigs);
      setFavorites(savedFavorites);
      setRecentDirectories(recentDirs);

      // Prioritize last chat config over default agent
      let preferredAgentId = "";
      let preferredWorkingDirectory = "";

      if (lastChatConfig) {
        // Verify the agent from last config still exists
        const agentExists = agentConfigs.some((a) => a.id === lastChatConfig.agentId);
        if (agentExists) {
          preferredAgentId = lastChatConfig.agentId;
          preferredWorkingDirectory = lastChatConfig.workingDirectory || "";
          logger.info("Loaded last chat configuration", {
            agentId: preferredAgentId,
            workingDirectory: preferredWorkingDirectory,
          });
        } else {
          logger.warn("Last used agent no longer exists, falling back to default", {
            lastAgentId: lastChatConfig.agentId,
          });
        }
      }

      // Fall back to default agent if no valid last config
      if (!preferredAgentId) {
        preferredAgentId = defaultAgentId ?? agentConfigs[0]?.id ?? "";
      }

      setSelectedAgentId(preferredAgentId);
      setWorkingDirectory(preferredWorkingDirectory);

      logger.info("Initial data loaded", {
        agentsCount: agentConfigs.length,
        favoritesCount: savedFavorites.length,
        recentDirsCount: recentDirs.length,
        hasLastConfig: !!lastChatConfig,
      });
    } catch (error) {
      await ErrorHandler.handleError(error, "Loading initial data");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadFavorites(): Promise<ChatFavorite[]> {
    try {
      const data = await LocalStorage.getItem<string>(FAVORITES_KEY);
      if (!data) return [];

      const parsed = JSON.parse(data) as Array<Omit<ChatFavorite, "createdAt"> & { createdAt: string }>;
      return parsed.map((fav) => ({
        ...fav,
        createdAt: new Date(fav.createdAt),
      }));
    } catch (error) {
      logger.error("Failed to load favorites", { error });
      return [];
    }
  }

  async function loadRecentDirectories(): Promise<string[]> {
    try {
      const data = await LocalStorage.getItem<string>(RECENT_CWD_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      logger.error("Failed to load recent directories", { error });
      return [];
    }
  }

  async function loadLastChatConfig(): Promise<LastChatConfig | null> {
    try {
      const data = await LocalStorage.getItem<string>(STORAGE_KEYS.LAST_CHAT_CONFIG);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      logger.error("Failed to load last chat config", { error });
      return null;
    }
  }

  async function saveLastChatConfig(agentId: string, workingDirectory?: string) {
    try {
      const config: LastChatConfig = {
        agentId,
        workingDirectory,
        timestamp: new Date().toISOString(),
      };
      await LocalStorage.setItem(STORAGE_KEYS.LAST_CHAT_CONFIG, JSON.stringify(config));
      logger.info("Last chat config saved", { agentId, workingDirectory });
    } catch (error) {
      logger.error("Failed to save last chat config", { error });
    }
  }

  async function saveFavorite(agentId: string, workingDirectory: string, name: string) {
    try {
      const newFavorite: ChatFavorite = {
        id: `fav_${Date.now()}`,
        name,
        agentId,
        workingDirectory: workingDirectory || undefined,
        createdAt: new Date(),
      };

      const updated = [...favorites, newFavorite];
      await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      setFavorites(updated);

      logger.info("Favorite saved", { favoriteId: newFavorite.id });
    } catch (error) {
      logger.error("Failed to save favorite", { error });
    }
  }

  async function updateRecentDirectories(directory: string) {
    if (!directory) return;

    try {
      const updated = [directory, ...recentDirectories.filter((d) => d !== directory)].slice(0, 10);
      await LocalStorage.setItem(RECENT_CWD_KEY, JSON.stringify(updated));
      setRecentDirectories(updated);
    } catch (error) {
      logger.error("Failed to update recent directories", { error });
    }
  }

  async function handleSubmit(values: FormValues) {
    try {
      const agentId = values.agentId || selectedAgentId;
      const cwd = values.workingDirectory || workingDirectory;

      if (!agentId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Agent Required",
          message: "Please select an agent to start the conversation.",
        });
        return;
      }

      const agent = agents.find((a) => a.id === agentId);
      if (!agent) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Agent Not Found",
          message: "The selected agent configuration was not found.",
        });
        return;
      }

      // Create a modified agent config with the working directory if provided
      const agentWithCwd: AgentConfig = {
        ...agent,
        workingDirectory: cwd || agent.workingDirectory,
      };

      logger.info("Starting chat with configuration", {
        agentId: agent.id,
        agentName: agent.name,
        originalWorkingDirectory: agent.workingDirectory,
        userSpecifiedCwd: cwd,
        finalWorkingDirectory: agentWithCwd.workingDirectory,
      });

      // Save favorite if requested
      if (values.saveFavorite && values.favoriteName) {
        await saveFavorite(agentId, cwd, values.favoriteName);
      }

      // Update recent directories
      if (cwd) {
        await updateRecentDirectories(cwd);
      }

      // Save as last chat config for next time
      await saveLastChatConfig(agentId, cwd);

      // Push to chat view
      push(<ChatCommand initialAgentId={agentId} initialAgent={agentWithCwd} />);

      await showToast({
        style: Toast.Style.Success,
        title: "Starting Chat",
        message: `Connected to ${agent.name}`,
      });
    } catch (error) {
      await ErrorHandler.handleError(error, "Starting chat");
    }
  }

  function handleFavoriteChange(favoriteId: string) {
    setSelectedFavoriteId(favoriteId);

    if (!favoriteId) return;

    const favorite = favorites.find((f) => f.id === favoriteId);
    if (favorite) {
      setSelectedAgentId(favorite.agentId);
      setWorkingDirectory(favorite.workingDirectory || "");
    }
  }

  async function deleteFavorite(favoriteId: string) {
    try {
      const updated = favorites.filter((f) => f.id !== favoriteId);
      await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      setFavorites(updated);

      if (selectedFavoriteId === favoriteId) {
        setSelectedFavoriteId("");
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Favorite Deleted",
      });
    } catch (error) {
      await ErrorHandler.handleError(error, "Deleting favorite");
    }
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Start New Chat"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Chat" icon={Icon.Message} onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action
              title="Configure Agents"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={() => open("raycast://extensions/agent-client-protocol/configure-agents")}
            />
            {selectedFavoriteId && (
              <Action
                title="Delete Favorite"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteFavorite(selectedFavoriteId)}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text="Configure your chat session before starting. The working directory will be used by the agent when running commands." />

      {/* Favorites Dropdown */}
      {favorites.length > 0 && (
        <Form.Dropdown
          id="favoriteId"
          title="Favorites"
          value={selectedFavoriteId}
          onChange={handleFavoriteChange}
          info="Quick access to your saved configurations"
        >
          <Form.Dropdown.Item value="" title="None (Configure Manually)" />
          {favorites.map((fav) => {
            const agent = agents.find((a) => a.id === fav.agentId);
            return (
              <Form.Dropdown.Item
                key={fav.id}
                value={fav.id}
                title={fav.name}
                icon={agent?.isBuiltIn ? Icon.ComputerChip : Icon.Gear}
              />
            );
          })}
        </Form.Dropdown>
      )}

      <Form.Separator />

      {/* Agent Selection */}
      <Form.Dropdown
        id="agentId"
        title="AI Agent"
        value={selectedAgentId}
        onChange={setSelectedAgentId}
        info="Select which AI agent to chat with"
      >
        {agents.length === 0 ? (
          <Form.Dropdown.Item value="" title="No agents configured" />
        ) : (
          agents.map((agent) => (
            <Form.Dropdown.Item
              key={agent.id}
              value={agent.id}
              title={agent.name}
              icon={agent.isBuiltIn ? Icon.ComputerChip : Icon.Gear}
            />
          ))
        )}
      </Form.Dropdown>

      {selectedAgent && selectedAgent.description && <Form.Description text={selectedAgent.description} />}

      {/* Working Directory */}
      <Form.TextField
        id="workingDirectory"
        title="Working Directory"
        placeholder="/Users/you/projects/myapp"
        value={workingDirectory}
        onChange={setWorkingDirectory}
        info="The directory where the agent will execute commands. Leave empty to use the agent's default."
      />

      {/* Recent Directories */}
      {recentDirectories.length > 0 && (
        <Form.Dropdown
          id="recentDirectory"
          title="Recent Directories"
          onChange={(value) => {
            if (value) setWorkingDirectory(value);
          }}
        >
          <Form.Dropdown.Item value="" title="Select a recent directory..." />
          {recentDirectories.map((dir, index) => (
            <Form.Dropdown.Item key={index} value={dir} title={dir} icon={Icon.Folder} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Separator />

      {/* Save as Favorite */}
      <Form.Checkbox
        id="saveFavorite"
        label="Save as Favorite"
        value={shouldSaveFavorite}
        onChange={setShouldSaveFavorite}
      />

      {shouldSaveFavorite && (
        <Form.TextField
          id="favoriteName"
          title="Favorite Name"
          placeholder="My Project Chat"
          info="Give this configuration a name for quick access later"
        />
      )}
    </Form>
  );
}
