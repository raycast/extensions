/**
 * Chat Command - Interactive AI conversation interface
 *
 * Provides a rich list-based chat experience with support for
 * message history, follow-up prompts, and long-lived sessions.
 */

import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { ConfigService } from "@/services/configService";
import { createLogger } from "@/utils/logging";
import { ErrorHandler } from "@/utils/errors";
import type { AgentConfig } from "@/types/extension";
import type { SessionMessage } from "@/types/entities";
import { useChatSession } from "@/hooks/useChatSession";

interface MessageComposerProps {
  title: string;
  initialMessage?: string;
  onSubmit: (text: string) => Promise<void>;
}

const logger = createLogger("ChatCommand");

export default function ChatCommand() {
  const chat = useChatSession();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  const configService = useMemo(() => new ConfigService(), []);

  useEffect(() => {
    async function loadAgents() {
      try {
        setIsLoadingAgents(true);
        const [agentConfigs, defaultAgentId] = await Promise.all([
          configService.getAgentConfigs(),
          configService.getDefaultAgent()
        ]);

        setAgents(agentConfigs);
        const preferredAgentId = defaultAgentId ?? agentConfigs[0]?.id;
        setSelectedAgentId(preferredAgentId ?? undefined);

        if (preferredAgentId) {
          const agent = agentConfigs.find((item) => item.id === preferredAgentId);
          if (agent) {
            chat.setActiveAgent(agent);
          }
        }

        logger.info("Agents loaded successfully", {
          count: agentConfigs.length,
          defaultAgent: defaultAgentId
        });
      } catch (error) {
        await ErrorHandler.handleError(error, "Loading agents");
      } finally {
        setIsLoadingAgents(false);
      }
    }

    loadAgents();
  }, [configService, chat.setActiveAgent]);

  useEffect(() => {
    if (!selectedAgentId) {
      return;
    }
    const agent = agents.find((item) => item.id === selectedAgentId);
    if (agent) {
      chat.setActiveAgent(agent);
    }
  }, [selectedAgentId, agents, chat.setActiveAgent]);

  const isProcessing = chat.status === "connecting" || chat.status === "processing";
  const selectedAgent = selectedAgentId ? agents.find((agent) => agent.id === selectedAgentId) : null;

  async function handleSend(message: string) {
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
  }

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
        return Icon.Person;
      case "assistant":
        return Icon.Robot;
      case "system":
        return Icon.Info;
      case "tool":
        return Icon.Wrench;
      default:
        return Icon.Circle;
    }
  }

  function formatMessageMarkdown(message: SessionMessage): string {
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

  const messageItems = chat.messages.map((message, index) => (
    <List.Item
      key={`${message.id}-${index}`}
      icon={getMessageIcon(message)}
      title={message.role === "user" ? "User Message" : "Agent Response"}
      accessories={getMessageAccessory(message)}
      detail={<List.Item.Detail markdown={formatMessageMarkdown(message)} />}
      actions={
        <ActionPanel>
          <Action.Push
            title={chat.conversation ? "Send Follow-Up Message" : "Send Message"}
            icon={Icon.PaperPlane}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            target={
              <MessageComposer
                title={chat.conversation ? "Send Follow-Up" : "Send Message"}
                onSubmit={handleSend}
              />
            }
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
              onAction={chat.resetSession}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  ));

  return (
    <List
      isLoading={isLoadingAgents || isProcessing}
      isShowingDetail
      searchBarPlaceholder="Search in conversation..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Agent"
          value={selectedAgentId}
          onChange={setSelectedAgentId}
        >
          {agents.map((agent) => (
            <List.Dropdown.Item key={agent.id} value={agent.id} title={agent.name} />
          ))}
        </List.Dropdown>
      }
    >
      {chat.messages.length === 0 ? (
        <List.EmptyView
          icon="🤖"
          title="Start a Conversation"
          description="Select an agent and send your first message to begin."
          actions={
            <ActionPanel>
              <Action.Push
                title="Send Message"
                icon={Icon.PaperPlane}
                target={
                  <MessageComposer
                    title="Send Message"
                    onSubmit={handleSend}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={conversationTitle} subtitle={`${chat.messages.length} messages`}>
          {messageItems}
        </List.Section>
      )}
    </List>
  );
}

function MessageComposer({ title, initialMessage, onSubmit }: MessageComposerProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { message?: string }) {
    const text = values.message ?? "";
    await onSubmit(text);
    pop();
  }

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send"
            icon={Icon.PaperPlane}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Ask a question or describe what you need help with..."
        defaultValue={initialMessage ?? ""}
        autoFocus
      />
    </Form>
  );
}
