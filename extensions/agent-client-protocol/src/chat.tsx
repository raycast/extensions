/**
 * Chat Command - Interactive AI conversation interface
 *
 * Provides a rich list-based chat experience with support for
 * message history, follow-up prompts, and long-lived sessions.
 */

import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { ConfigService } from "@/services/configService";
import { StorageService } from "@/services/storageService";
import { createLogger } from "@/utils/logging";
import { ErrorHandler } from "@/utils/errors";
import type { AgentConfig } from "@/types/extension";
import type { SessionMessage } from "@/types/entities";
import { useChatSession } from "@/hooks/useChatSession";

const logger = createLogger("ChatCommand");

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
          configService.getDefaultAgent()
        ]);

        setAgents(agentConfigs);

        // If we have an initial agent, use it
        if (initialAgent) {
          setSelectedAgentId(initialAgent.id);
          chat.setActiveAgent(initialAgent);
          logger.info("Using initial agent configuration", { agentId: initialAgent.id, workingDirectory: initialAgent.workingDirectory });
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
          hasInitialAgent: !!initialAgent
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
            message: "Unable to locate the selected conversation."
          });
          return;
        }

        const agentId = existing.agentConfigId || initialAgentId || selectedAgentId || agents[0]?.id;
        if (!agentId) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Agent Not Available",
            message: "No agent configuration is available for this conversation."
          });
          return;
        }

        const agent = agents.find((item) => item.id === agentId);
        if (!agent) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Agent Not Found",
            message: "Please recreate the agent configuration before continuing the conversation."
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
  }, [initialSessionId, initialAgentId, initialLoadComplete, isLoadingAgents, agents, storageService, chat.loadConversation, selectedAgentId]);

  const isProcessing = chat.status === "connecting" || chat.status === "processing";
  const selectedAgent = selectedAgentId ? agents.find((agent) => agent.id === selectedAgentId) : null;

  async function handleSend(message: string) {
    if (chat.status === "connecting") {
      await showToast({
        style: Toast.Style.Animated,
        title: "Connecting to agent",
        message: "Please wait for the connection to establish."
      });
      return;
    }

    if (chat.status === "processing") {
      await showToast({
        style: Toast.Style.Animated,
        title: "Agent is thinking",
        message: "Wait for the current response to finish before sending another message."
      });
      return;
    }

    if (!message.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a message",
        message: "Please provide a message to send."
      });
      return;
    }

    if (!selectedAgent) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select an agent",
        message: "Choose an agent before sending a message."
      });
      return;
    }

    await chat.sendMessage(message);
    setSearchText("");
  }

  // Remove handleSearchSubmit - we'll use Enter key via actions instead

  function getMessageAccessory(message: SessionMessage) {
    const time = message.timestamp instanceof Date
      ? message.timestamp.toLocaleTimeString()
      : "";

    return [
      {
        text: message.role === "user" ? "You" : message.role === "assistant" ? selectedAgent?.name ?? "Agent" : "System"
      },
      {
        text: time
      }
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
              parts.push(`**Result:**\n\`\`\`\n${typeof message.toolResult.result === 'string' ? message.toolResult.result : JSON.stringify(message.toolResult.result, null, 2)}\n\`\`\``);
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

        return parts.join('\n\n');
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

    return message.content;
  }

  const conversationTitle = chat.conversation
    ? chat.conversation.metadata?.title ?? chat.conversation.sessionId
    : "New Conversation";

  const conversationSubtitle = (() => {
    if (!chat.conversation) {
      return selectedAgent ? `Agent: ${selectedAgent.name}` : undefined;
    }

    const parts: string[] = [];
    if (selectedAgent) {
      parts.push(`Agent: ${selectedAgent.name}`);
    }
    if (chat.conversation.context?.workingDirectory) {
      parts.push(`CWD: ${chat.conversation.context.workingDirectory}`);
    }
    return parts.length > 0 ? parts.join(" | ") : undefined;
  })();

  const messageItems = chat.messages.map((message, index) => {
    const speakerLabel = message.role === "user"
      ? "You"
      : message.role === "assistant"
        ? selectedAgent?.name ?? "Agent"
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
            <Action
              title={chat.conversation ? "Send Follow-Up Message" : "Send Message"}
              icon={Icon.Envelope}
              onAction={async () => {
                if (!searchText.trim()) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Enter a message",
                    message: "Type your message in the search bar first."
                  });
                  return;
                }
              await handleSend(searchText);
            }}
          />
            {message.content && (
              <Action.CopyToClipboard
                title="Copy Message"
                content={message.content}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
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

  return (
    <List
      isLoading={isLoadingAgents || isProcessing}
      isShowingDetail
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={selectedAgent ? `Chatting with ${selectedAgent.name} - Type a message and press Enter` : "Type a message and press Enter"}
    >
      {chat.messages.length === 0 ? (
        <List.EmptyView
          icon={Icon.ComputerChip}
          title="Start a Conversation"
          description="Select an agent, type your question above, and press Enter to begin."
          actions={
            <ActionPanel>
              <Action
                title="Send Message"
                icon={Icon.Envelope}
                shortcut={{ modifiers: [], key: "return" }}
                onAction={async () => {
                  await handleSend(searchText);
                }}
              />
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
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={conversationTitle} subtitle={conversationSubtitle || `${chat.messages.length} messages`}>
          {messageItems}
        </List.Section>
      )}
    </List>
  );
}
