/**
 * Chat Command - Interactive AI conversation interface
 *
 * Provides a rich list-based chat experience with support for
 * message history, follow-up prompts, and long-lived sessions.
 */

import { Action, ActionPanel, Alert, Color, Form, Icon, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { ConfigService } from "@/services/configService";
import { StorageService } from "@/services/storageService";
import { createLogger } from "@/utils/logging";
import { ErrorHandler } from "@/utils/errors";
import type { AgentConfig } from "@/types/extension";
import type { SessionMessage, ProjectContext } from "@/types/entities";
import type { AvailableCommand } from "@/types/acp";
import { useChatSession } from "@/hooks/useChatSession";
import { pickDirectories, pickFiles } from "@/utils/filePicker";
import * as path from "path";

const logger = createLogger("ChatCommand");

function formatBytes(size: number): string {
  if (!Number.isFinite(size)) {
    return `${size}`;
  }

  if (size < 1024) {
    return `${size} B`;
  }

  const kb = size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }

  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function getContextTitle(context: ProjectContext): string {
  const baseName = path.basename(context.path);
  if (context.type === "selection") {
    return `${baseName} (Selection)`;
  }
  return baseName || context.path;
}

function getContextIcon(context: ProjectContext): Icon {
  switch (context.type) {
    case "file":
      return Icon.Document;
    case "directory":
      return Icon.Folder;
    case "selection":
      return Icon.Highlight;
    default:
      return Icon.Circle;
  }
}

function buildContextMarkdown(context: ProjectContext): string {
  if (!context.content) {
    return "_No cached content_";
  }

  if (context.type === "directory") {
    return `\`\`\`\n${context.content}\n\`\`\``;
  }

  const language = context.language ?? "text";
  return `\`\`\`${language}\n${context.content}\n\`\`\``;
}

type ChatCommandProps = {
  initialSessionId?: string;
  initialAgentId?: string;
  initialAgent?: AgentConfig; // Pre-configured agent with working directory
};

export default function ChatCommand({ initialSessionId, initialAgentId, initialAgent }: ChatCommandProps = {}) {
  const chat = useChatSession();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [searchText, setSearchText] = useState("");

  const configService = useMemo(() => new ConfigService(), []);
  const storageService = useMemo(() => new StorageService(), []);

  useEffect(() => {
    async function loadAgents() {
      try {
        setIsLoadingAgents(true);
        const [agentConfigs, defaultAgentId] = await Promise.all([
          configService.getAgentConfigs(),
          configService.getDefaultAgent(),
        ]);

        setAgents(agentConfigs);

        // If we have an initial agent, use it
        if (initialAgent) {
          setSelectedAgentId(initialAgent.id);
          chat.setActiveAgent(initialAgent);
          logger.info("Using initial agent configuration", {
            agentId: initialAgent.id,
            workingDirectory: initialAgent.workingDirectory,
          });
        } else {
          const preferredAgentId = initialAgentId ?? defaultAgentId ?? agentConfigs[0]?.id;
          setSelectedAgentId(preferredAgentId ?? undefined);

          if (preferredAgentId) {
            const agent = agentConfigs.find((item) => item.id === preferredAgentId);
            if (agent) {
              chat.setActiveAgent(agent);
            }
          }
        }

        logger.info("Agents loaded successfully", {
          count: agentConfigs.length,
          defaultAgent: defaultAgentId,
          hasInitialAgent: !!initialAgent,
        });
      } catch (error) {
        await ErrorHandler.handleError(error, "Loading agents");
      } finally {
        setIsLoadingAgents(false);
      }
    }

    loadAgents();
  }, [configService, chat.setActiveAgent, initialAgent, initialAgentId]);

  useEffect(() => {
    // Skip this effect if we have an initialAgent - it's already set in the first useEffect
    if (initialAgent) {
      return;
    }

    if (!selectedAgentId) {
      return;
    }
    const agent = agents.find((item) => item.id === selectedAgentId);
    if (agent) {
      chat.setActiveAgent(agent);
    }
  }, [selectedAgentId, agents, chat.setActiveAgent, initialAgent]);

  useEffect(() => {
    if (!initialSessionId && !initialLoadComplete && !isLoadingAgents) {
      setInitialLoadComplete(true);
      return;
    }

    if (!initialSessionId || initialLoadComplete || isLoadingAgents) {
      return;
    }

    async function loadInitialConversation() {
      try {
        await storageService.initialize();
        const existing = initialSessionId ? await storageService.getConversation(initialSessionId) : null;

        if (!existing) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Conversation Not Found",
            message: "Unable to locate the selected conversation.",
          });
          return;
        }

        const agentId = existing.agentConfigId || initialAgentId || selectedAgentId || agents[0]?.id;
        if (!agentId) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Agent Not Available",
            message: "No agent configuration is available for this conversation.",
          });
          return;
        }

        const agent = agents.find((item) => item.id === agentId);
        if (!agent) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Agent Not Found",
            message: "Please recreate the agent configuration before continuing the conversation.",
          });
          return;
        }

        setSelectedAgentId(agent.id);
        if (initialSessionId) {
          await chat.loadConversation(initialSessionId, agent);
        }
      } catch (error) {
        await ErrorHandler.handleError(error, "Loading conversation");
      } finally {
        setInitialLoadComplete(true);
      }
    }

    loadInitialConversation();
  }, [
    initialSessionId,
    initialAgentId,
    initialLoadComplete,
    isLoadingAgents,
    agents,
    storageService,
    chat.loadConversation,
    selectedAgentId,
  ]);

  const isProcessing = chat.status === "connecting" || chat.status === "processing";
  const selectedAgent = selectedAgentId ? agents.find((agent) => agent.id === selectedAgentId) : null;
  const hasConversation = Boolean(chat.conversation);

  function getContextAccessories(context: ProjectContext): List.Item.Accessory[] {
    const accessories: List.Item.Accessory[] = [];
    const typeLabel = context.type === "file" ? "File" : context.type === "directory" ? "Directory" : "Selection";
    const typeColor =
      context.type === "directory" ? Color.Orange : context.type === "selection" ? Color.Blue : Color.Green;

    accessories.push({ tag: { value: typeLabel, color: typeColor } });

    if (context.language) {
      accessories.push({ tag: { value: context.language, color: Color.Magenta } });
    }

    accessories.push({ text: formatBytes(context.size) });

    if (context.metadata?.isTruncated) {
      accessories.push({ tag: { value: "Truncated", color: Color.Red } });
    }

    return accessories;
  }

  async function handleAddFileContext() {
    const paths = await pickFiles({
      allowMultiple: true,
      prompt: "Select files to share with the agent",
    });

    if (paths.length === 0) {
      return;
    }

    try {
      const added = await chat.addFileContexts(paths);
      const message = added.length === 1 ? getContextTitle(added[0]) : `${added.length} files shared`;

      await showToast({
        style: Toast.Style.Success,
        title: "Context Shared",
        message,
      });
    } catch (error) {
      logger.warn("Failed to add file context", { error });
    }
  }

  async function handleAddDirectoryContext() {
    const paths = await pickDirectories({
      allowMultiple: true,
      prompt: "Select directories to summarize for the agent",
    });

    if (paths.length === 0) {
      return;
    }

    try {
      const added = await chat.addDirectoryContexts(paths);
      const message = added.length === 1 ? getContextTitle(added[0]) : `${added.length} directories shared`;

      await showToast({
        style: Toast.Style.Success,
        title: "Context Shared",
        message,
      });
    } catch (error) {
      logger.warn("Failed to add directory context", { error });
    }
  }

  async function handleRefreshContexts() {
    if (!hasConversation) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Conversation",
        message: "Create or load a conversation before refreshing context.",
      });
      return;
    }

    try {
      await chat.refreshContexts();
      await showToast({
        style: Toast.Style.Success,
        title: "Contexts Refreshed",
      });
    } catch (error) {
      logger.warn("Failed to refresh contexts", { error });
    }
  }

  async function handleRemoveContext(context: ProjectContext) {
    const confirmed = await confirmAlert({
      title: "Remove Context?",
      message: `Stop sharing:\n${context.path}`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await chat.removeContext(context.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Context Removed",
        message: getContextTitle(context),
      });
    } catch (error) {
      logger.warn("Failed to remove context", { error });
    }
  }

  function renderContextActions() {
    return (
      <ActionPanel.Section title="Context">
        <Action
          title="Add File Context"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={handleAddFileContext}
        />
        <Action
          title="Add Directory Context"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          onAction={handleAddDirectoryContext}
        />
        {chat.contexts.length > 0 && (
          <Action title="Refresh Contexts" icon={Icon.ArrowClockwise} onAction={handleRefreshContexts} />
        )}
      </ActionPanel.Section>
    );
  }

  function renderSlashCommandActions() {
    const commands = chat.conversation?.availableCommands ?? [];
    if (commands.length === 0) {
      return null;
    }

    const requiresCommandInput = (command: AvailableCommand): boolean => {
      return typeof command.input === "object" && command.input !== null;
    };

    const getCommandInputHint = (command: AvailableCommand): string | undefined => {
      if (typeof command.input !== "object" || command.input === null) {
        return undefined;
      }

      const hint = (command.input as { hint?: unknown }).hint;
      return typeof hint === "string" ? hint : undefined;
    };

    function SlashCommandForm({
      command,
      onSubmit,
    }: {
      command: AvailableCommand;
      onSubmit: (argument?: string) => Promise<void>;
    }) {
      const placeholder = getCommandInputHint(command) ?? "";

      return (
        <Form
          navigationTitle={`/${command.name}`}
          actions={
            <ActionPanel>
              <Action.SubmitForm
                title={`Run /${command.name}`}
                icon={Icon.Bolt}
                onSubmit={async ({ argument }: { argument?: string }) => {
                  await onSubmit(argument);
                }}
              />
            </ActionPanel>
          }
        >
          {command.description ? <Form.Description text={command.description} /> : null}
          <Form.TextField id="argument" title="Input" placeholder={placeholder} autoFocus />
        </Form>
      );
    }

    return (
      <ActionPanel.Section title="Slash Commands">
        <ActionPanel.Submenu title="Run Slash Command" icon={Icon.Bolt}>
          {commands.map((command) =>
            requiresCommandInput(command) ? (
              <Action.Push
                key={command.name}
                title={`/${command.name}`}
                icon={Icon.Bolt}
                target={
                  <SlashCommandForm
                    command={command}
                    onSubmit={async (argument) => {
                      await chat.runSlashCommand(command.name, argument);
                    }}
                  />
                }
              />
            ) : (
              <Action
                key={command.name}
                title={`/${command.name}`}
                icon={Icon.Bolt}
                onAction={async () => {
                  await chat.runSlashCommand(command.name);
                }}
              />
            ),
          )}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
    );
  }

  async function handleSend(message: string) {
    if (chat.status === "connecting") {
      await showToast({
        style: Toast.Style.Animated,
        title: "Connecting to agent",
        message: "Please wait for the connection to establish.",
      });
      return;
    }

    if (chat.status === "processing") {
      await showToast({
        style: Toast.Style.Animated,
        title: "Agent is thinking",
        message: "Wait for the current response to finish before sending another message.",
      });
      return;
    }

    if (!message.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a message",
        message: "Please provide a message to send.",
      });
      return;
    }

    if (!selectedAgent) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select an agent",
        message: "Choose an agent before sending a message.",
      });
      return;
    }

    await chat.sendMessage(message);
    setSearchText("");
  }

  // Remove handleSearchSubmit - we'll use Enter key via actions instead

  function getMessageAccessory(message: SessionMessage) {
    const time = message.timestamp instanceof Date ? message.timestamp.toLocaleTimeString() : "";

    return [
      {
        text:
          message.role === "user" ? "You" : message.role === "assistant" ? (selectedAgent?.name ?? "Agent") : "System",
      },
      {
        text: time,
      },
    ];
  }

  function getMessageIcon(message: SessionMessage) {
    switch (message.role) {
      case "user":
        return Icon.PersonCircle;
      case "assistant":
        return Icon.Message;
      case "system":
        return Icon.Info;
      case "tool":
        return Icon.Terminal;
      default:
        return Icon.Circle;
    }
  }

  function formatMessageMarkdown(message: SessionMessage): string {
    // Handle tool messages specially
    if (message.role === "tool") {
      if (message.content && message.content.trim()) {
        return message.content;
      }

      // If no content but we have tool call info, show tool details
      if (message.toolCall) {
        const parts = [`**Tool:** ${message.toolCall.name}`];

        if (message.toolCall.arguments && Object.keys(message.toolCall.arguments).length > 0) {
          parts.push(`**Arguments:**\n\`\`\`json\n${JSON.stringify(message.toolCall.arguments, null, 2)}\n\`\`\``);
        }

        if (message.toolResult) {
          if (message.toolResult.success) {
            parts.push(`**Status:** ✅ Completed`);
            if (message.toolResult.result) {
              parts.push(
                `**Result:**\n\`\`\`\n${typeof message.toolResult.result === "string" ? message.toolResult.result : JSON.stringify(message.toolResult.result, null, 2)}\n\`\`\``,
              );
            }
          } else {
            parts.push(`**Status:** ❌ Failed`);
            if (message.toolResult.error) {
              parts.push(`**Error:** ${message.toolResult.error}`);
            }
          }
        } else {
          // Tool call without result (might be in progress)
          parts.push(`**Status:** ⏳ In progress`);
        }

        return parts.join("\n\n");
      }

      // Fallback for tool messages with no info
      return "_Tool call executed_";
    }

    if (!message.content) {
      return "_No content_";
    }

    if (message.role === "system") {
      return `> ${message.content}`;
    }

    // Wrap assistant messages in a code block
    if (message.role === "assistant") {
      return `${message.content}`;
    }

    return message.content;
  }

  const conversationTitle = chat.conversation
    ? (chat.conversation.metadata?.title ?? chat.conversation.sessionId)
    : "New Conversation";

  const conversationSubtitle = (() => {
    if (!chat.conversation) {
      return selectedAgent ? `Agent: ${selectedAgent.name}` : undefined;
    }

    const parts: string[] = [];
    if (selectedAgent) {
      parts.push(`Agent: ${selectedAgent.name}`);
    }
    if (chat.conversation.currentMode) {
      parts.push(`Mode: ${chat.conversation.currentMode.name}`);
    }
    if (chat.conversation.context?.workingDirectory) {
      parts.push(`CWD: ${chat.conversation.context.workingDirectory}`);
    }
    return parts.length > 0 ? parts.join(" | ") : undefined;
  })();

  const contextItems = chat.contexts.map((context) => {
    const lastModified =
      context.metadata?.lastModified instanceof Date
        ? context.metadata.lastModified.toLocaleString()
        : context.metadata?.lastModified
          ? String(context.metadata.lastModified)
          : undefined;

    return (
      <List.Item
        key={context.id}
        icon={getContextIcon(context)}
        title={getContextTitle(context)}
        accessories={getContextAccessories(context)}
        detail={
          <List.Item.Detail
            markdown={buildContextMarkdown(context)}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Path" text={context.path} />
                <List.Item.Detail.Metadata.Label title="Type" text={context.type} />
                {context.language && <List.Item.Detail.Metadata.Label title="Language" text={context.language} />}
                <List.Item.Detail.Metadata.Label title="Size" text={formatBytes(context.size)} />
                {lastModified && <List.Item.Detail.Metadata.Label title="Last Modified" text={lastModified} />}
                {context.metadata?.lineRange && (
                  <List.Item.Detail.Metadata.Label
                    title="Line Range"
                    text={`${context.metadata.lineRange.start}-${context.metadata.lineRange.end}`}
                  />
                )}
                {context.metadata?.isTruncated && (
                  <List.Item.Detail.Metadata.Label title="Note" text="Content truncated for size limits" />
                )}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            {renderContextActions()}
            <ActionPanel.Section title="Context Item">
              <Action.ShowInFinder path={context.path} />
              <Action.CopyToClipboard title="Copy Path" content={context.path} />
              <Action
                title="Remove Context"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  await handleRemoveContext(context);
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  });

  const messageItems = chat.messages.map((message, index) => {
    const speakerLabel =
      message.role === "user"
        ? "You"
        : message.role === "assistant"
          ? (selectedAgent?.name ?? "Agent")
          : message.role === "tool"
            ? "Tool"
            : "System";

    const firstLine = message.content?.split("\n")[0] ?? "";
    const itemTitle = firstLine ? `${speakerLabel}: ${firstLine}` : speakerLabel;

    return (
      <List.Item
        key={`${message.id}-${index}`}
        icon={getMessageIcon(message)}
        title={itemTitle}
        accessories={getMessageAccessory(message)}
        detail={<List.Item.Detail markdown={formatMessageMarkdown(message)} />}
        actions={
          <ActionPanel>
            {isProcessing ? (
              <Action
                title="Cancel Message"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "." }}
                onAction={async () => {
                  await chat.cancelMessage();
                }}
              />
            ) : (
              <Action
                title={chat.conversation ? "Send Follow-Up Message" : "Send Message"}
                icon={Icon.Envelope}
                onAction={async () => {
                  if (!searchText.trim()) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Enter a message",
                      message: "Type your message in the search bar first.",
                    });
                    return;
                  }
                  await handleSend(searchText);
                }}
              />
            )}
            {renderSlashCommandActions()}
            {message.content && (
              <Action.CopyToClipboard
                title="Copy Message"
                content={message.content}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
            {renderContextActions()}
            <ActionPanel.Section>
              <Action
                title="Restart Conversation"
                icon={Icon.Repeat}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                onAction={async () => {
                  setSearchText("");
                  await chat.resetSession();
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  });

  const modeDropdown =
    chat.conversation?.availableModes && chat.conversation.availableModes.length > 0 ? (
      <List.Dropdown
        tooltip="Switch Agent Mode"
        value={chat.conversation.currentMode?.id ?? ""}
        onChange={async (newModeId) => {
          if (newModeId && newModeId !== chat.conversation?.currentMode?.id) {
            await chat.switchMode(newModeId);
          }
        }}
      >
        {chat.conversation.availableModes.map((mode) => (
          <List.Dropdown.Item key={mode.id} title={mode.name} value={mode.id} />
        ))}
      </List.Dropdown>
    ) : undefined;

  return (
    <List
      isLoading={isLoadingAgents || isProcessing}
      isShowingDetail
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        selectedAgent
          ? `Chatting with ${selectedAgent.name} - Type a message and press Enter`
          : "Type a message and press Enter"
      }
      searchBarAccessory={modeDropdown}
    >
      {chat.contexts.length > 0 && (
        <List.Section
          title="Shared Context"
          subtitle={`${chat.contexts.length} item${chat.contexts.length === 1 ? "" : "s"}`}
        >
          {contextItems}
        </List.Section>
      )}
      {chat.messages.length > 0 ? (
        <List.Section title={conversationTitle} subtitle={conversationSubtitle || `${chat.messages.length} messages`}>
          {messageItems}
        </List.Section>
      ) : chat.contexts.length === 0 ? (
        <List.EmptyView
          icon={Icon.ComputerChip}
          title="Start a Conversation"
          description="Select an agent, type your question above, and press Enter to begin."
          actions={
            <ActionPanel>
              {isProcessing ? (
                <Action
                  title="Cancel Message"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  onAction={async () => {
                    await chat.cancelMessage();
                  }}
                />
              ) : (
                <Action
                  title="Send Message"
                  icon={Icon.Envelope}
                  shortcut={{ modifiers: [], key: "return" }}
                  onAction={async () => {
                    await handleSend(searchText);
                  }}
                />
              )}
              {renderSlashCommandActions()}
              <Action
                title="Restart Conversation"
                icon={Icon.Repeat}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                onAction={async () => {
                  setSearchText("");
                  await chat.resetSession();
                }}
              />
              {renderContextActions()}
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
