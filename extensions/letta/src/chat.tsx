/**
 * Unified Chat Command
 *
 * Shows conversations for the selected agent.
 * - Left panel: List of conversations with selected agent
 * - Right panel: Full conversation detail
 * - Dropdown: Select which agent to chat with (from all accounts)
 * - Search bar: Type message and press Enter to send
 */

import { Action, ActionPanel, List, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useLettaClient, useAgents, useConversations, toAgentsWithAccount } from "./hooks";
import type { Conversation, AgentWithAccount } from "./types";
import MemoryCommand from "./memory";

export default function ChatCommand() {
  const { accounts, getClientForAccount, getClientForAgent, showReasoning } = useLettaClient();
  const { agents, isLoading: agentsLoading, revalidate: revalidateAgents } = useAgents(accounts, getClientForAccount);

  // Map agents to include colors and account info
  const agentsWithColors: AgentWithAccount[] = useMemo(() => {
    return toAgentsWithAccount(agents || []);
  }, [agents]);

  // Conversations state
  const {
    summaries,
    activeConversation,
    isLoading: conversationsLoading,
    agentFilter,
    setAgentFilter,
    startConversation,
    addMessage,
    updateLastMessage,
    setActiveConversation,
    deleteConversation,
    getConversation,
  } = useConversations();

  // Chat state
  const [searchText, setSearchText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  // Auto-select first agent if none selected
  useEffect(() => {
    if (agentsWithColors.length > 0 && agentFilter === "all") {
      setAgentFilter(agentsWithColors[0].id);
    }
  }, [agentsWithColors, agentFilter, setAgentFilter]);

  // Get the currently selected agent (always have one selected)
  const selectedAgent = useMemo(() => {
    // If viewing a conversation, use that agent
    if (activeConversation) {
      return agentsWithColors.find((a) => a.id === activeConversation.agentId);
    }
    // Otherwise use the filtered agent
    return agentsWithColors.find((a) => a.id === agentFilter) || agentsWithColors[0];
  }, [activeConversation, agentFilter, agentsWithColors]);

  // Send message to the selected agent
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming || !selectedAgent) return;

      // Get the client for this agent's account
      const client = getClientForAgent(selectedAgent);
      if (!client) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: `No client found for account ${selectedAgent.accountName}`,
        });
        return;
      }

      // Get or create conversation
      let conversation = activeConversation;
      if (!conversation || conversation.agentId !== selectedAgent.id) {
        conversation = startConversation(selectedAgent);
      }

      // Add user message
      addMessage(conversation.id, {
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      });

      setIsStreaming(true);
      setStreamingContent("");

      try {
        // Add placeholder assistant message
        addMessage(conversation.id, {
          role: "assistant",
          content: "",
          timestamp: new Date(),
        });

        let finalAnswer = "";
        let finalReasoning = "";
        let streamingWorked = false;

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const messagesApi = client.agents.messages as any;
          let stream: AsyncIterable<unknown> | null = null;

          if (typeof messagesApi.createStream === "function") {
            stream = await messagesApi.createStream(selectedAgent.id, {
              input: text.trim(),
              stream_tokens: false,
            });
          } else if (typeof messagesApi.stream === "function") {
            stream = await messagesApi.stream(selectedAgent.id, {
              input: text.trim(),
              stream_tokens: false,
            });
          }

          if (stream) {
            const contentByMessageId = new Map<string, string>();
            const reasoningParts: string[] = [];

            for await (const chunk of stream) {
              const event = chunk as Record<string, unknown>;
              const messageType = event.message_type as string | undefined;
              const messageId = event.id as string | undefined;

              switch (messageType) {
                case "assistant_message": {
                  const content = extractAssistantContent(event.content);
                  if (content && messageId) {
                    const existing = contentByMessageId.get(messageId) || "";
                    if (content.length > existing.length) {
                      contentByMessageId.set(messageId, content);
                    }
                    finalAnswer = Array.from(contentByMessageId.values()).join("");
                    setStreamingContent(finalAnswer);
                    updateLastMessage(conversation!.id, finalAnswer, finalReasoning);
                  }
                  break;
                }
                case "reasoning_message":
                case "hidden_reasoning_message": {
                  const reasoning = (event.reasoning as string) || (event.hidden_reasoning as string) || "";
                  if (reasoning) {
                    reasoningParts.push(reasoning);
                    finalReasoning = reasoningParts.join("\n");
                  }
                  break;
                }
              }
            }
            streamingWorked = true;
          }
        } catch {
          // Streaming not available, fall back to non-streaming
        }

        // Fallback to non-streaming
        if (!streamingWorked) {
          const response = await client.agents.messages.create(selectedAgent.id, {
            input: text.trim(),
          });

          const responseMessages: Record<string, unknown>[] = Array.isArray(response)
            ? response
            : (((response as unknown as Record<string, unknown>).messages as Record<string, unknown>[]) ?? []);

          for (const msg of responseMessages) {
            const msgType = msg.message_type as string | undefined;
            if (msgType === "assistant_message") {
              finalAnswer += extractAssistantContent(msg.content);
            } else if (msgType === "reasoning_message") {
              finalReasoning += (msg.reasoning as string) || "";
            }
          }
        }

        updateLastMessage(conversation!.id, finalAnswer, finalReasoning, true);

        showToast({
          style: Toast.Style.Success,
          title: "Response received",
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error instanceof Error ? error.message : "Failed to send message",
        });
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    [
      getClientForAgent,
      selectedAgent,
      activeConversation,
      startConversation,
      addMessage,
      updateLastMessage,
      isStreaming,
    ]
  );

  // Handle search/input submission
  const handleSubmit = useCallback(() => {
    if (searchText.trim() && selectedAgent) {
      sendMessage(searchText);
      setSearchText("");
    }
  }, [searchText, sendMessage, selectedAgent]);

  // Dynamic placeholder based on state
  const searchPlaceholder = useMemo(() => {
    if (isStreaming) return "Waiting for response...";
    if (selectedAgent) return `Message ${selectedAgent.name}...`;
    return "Select an agent to start chatting...";
  }, [isStreaming, selectedAgent]);

  // Build markdown for conversation detail
  const buildConversationMarkdown = useCallback(
    (conversation: Conversation | null): string => {
      if (!conversation) {
        return `## Welcome to Letta\n\nSelect a conversation or type a message to start chatting.\n\n${
          selectedAgent
            ? `**Current Agent:** ${selectedAgent.name} (${selectedAgent.accountName})`
            : "Select an agent from the dropdown."
        }`;
      }

      const lines: string[] = [];
      lines.push(`## ${conversation.agentName}\n`);
      lines.push(`*Project: ${conversation.accountName}*\n`);

      if (conversation.messages.length === 0) {
        lines.push("*No messages yet. Type your message above and press Enter.*");
        return lines.join("\n");
      }

      // Show messages in chronological order
      for (const msg of conversation.messages) {
        if (msg.role === "user") {
          lines.push(`**You:** ${msg.content}\n`);
        } else {
          // Show streaming content if this is the last message and we're streaming
          const content =
            isStreaming && msg === conversation.messages[conversation.messages.length - 1]
              ? streamingContent || "Thinking..."
              : msg.content;

          lines.push(`${content}\n`);

          // Show reasoning if enabled
          if (showReasoning && msg.reasoning) {
            lines.push(`\n> 🧠 *${msg.reasoning.slice(0, 200)}${msg.reasoning.length > 200 ? "..." : ""}*\n`);
          }
        }
        lines.push("---\n");
      }

      return lines.join("\n");
    },
    [selectedAgent, showReasoning, isStreaming, streamingContent]
  );

  // Group agents by account for the dropdown
  const accountGroups = useMemo(() => {
    const groups = new Map<string, AgentWithAccount[]>();
    for (const agent of agentsWithColors) {
      const existing = groups.get(agent.accountId) || [];
      existing.push(agent);
      groups.set(agent.accountId, existing);
    }
    return groups;
  }, [agentsWithColors]);

  // Agent selector dropdown with account grouping
  const agentDropdown = (
    <List.Dropdown
      tooltip="Select Agent"
      value={selectedAgent?.id || ""}
      onChange={(newAgentId) => {
        setAgentFilter(newAgentId);
        setActiveConversation(null); // Clear active conversation when switching agents
      }}
    >
      {Array.from(accountGroups.entries()).map(([accountId, accountAgents]) => {
        const accountName = accountAgents[0]?.accountName || accountId;
        return (
          <List.Dropdown.Section key={accountId} title={accountName}>
            {accountAgents.map((agent) => (
              <List.Dropdown.Item
                key={agent.id}
                title={agent.name}
                value={agent.id}
                icon={{ source: Icon.Person, tintColor: agent.color }}
              />
            ))}
          </List.Dropdown.Section>
        );
      })}
    </List.Dropdown>
  );

  const isLoading = agentsLoading || conversationsLoading || isStreaming;
  const hasAgents = agentsWithColors.length > 0;
  const hasConversations = summaries.length > 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={hasConversations || activeConversation !== null}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={searchPlaceholder}
      searchBarAccessory={agentDropdown}
      onSelectionChange={(id) => {
        if (id) setActiveConversation(id);
      }}
    >
      {/* Empty state - no agents */}
      {!isLoading && !hasAgents && (
        <List.EmptyView
          icon={Icon.Person}
          title="No Agents Found"
          description="Create agents at app.letta.com, then refresh"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.Globe} title="Open Letta" url="https://app.letta.com" />
              <Action icon={Icon.ArrowClockwise} title="Refresh Agents" onAction={() => revalidateAgents()} />
            </ActionPanel>
          }
        />
      )}

      {/* Empty state - no conversations */}
      {!isLoading && hasAgents && !hasConversations && (
        <List.EmptyView
          icon={Icon.Message}
          title="No Conversations Yet"
          description={`Type a message above to start chatting with ${selectedAgent?.name || "an agent"}`}
          actions={
            <ActionPanel>
              <Action icon={Icon.Message} title="Send Message" onAction={handleSubmit} />
            </ActionPanel>
          }
        />
      )}

      {/* Conversations list */}
      {hasConversations && (
        <List.Section
          title="Conversations"
          subtitle={`${summaries.length} conversation${summaries.length === 1 ? "" : "s"}`}
        >
          {summaries.map((summary) => (
            <List.Item
              key={summary.id}
              id={summary.id}
              icon={{ source: Icon.Message, tintColor: summary.agentColor }}
              title={summary.title}
              subtitle={summary.lastMessage}
              accessories={[{ tag: { value: summary.accountName, color: summary.agentColor } }]}
              detail={<List.Item.Detail markdown={buildConversationMarkdown(getConversation(summary.id) || null)} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Chat">
                    <Action icon={Icon.Message} title="Send Message" onAction={handleSubmit} />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Conversation">
                    <Action
                      icon={Icon.Trash}
                      title="Delete Conversation"
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={async () => {
                        const confirmed = await confirmAlert({
                          title: "Delete Conversation?",
                          message: "This will delete the local conversation history.",
                          primaryAction: {
                            title: "Delete",
                            style: Alert.ActionStyle.Destructive,
                          },
                        });
                        if (confirmed) {
                          deleteConversation(summary.id);
                          showToast({
                            style: Toast.Style.Success,
                            title: "Conversation deleted",
                          });
                        }
                      }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Agent">
                    <Action.Push
                      icon={Icon.Book}
                      title="View Agent Memory"
                      target={
                        <MemoryCommand
                          agentId={summary.agentId}
                          agentName={summary.agentName}
                          accountId={summary.accountId}
                        />
                      }
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                    />
                    <Action.OpenInBrowser
                      icon={Icon.Globe}
                      title="Open Agent in Letta"
                      url={`https://app.letta.com/agents/${summary.agentId}`}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action
                      icon={Icon.ArrowClockwise}
                      title="Refresh Agents"
                      onAction={() => revalidateAgents()}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

/**
 * Extract text content from AssistantMessage content field
 */
function extractAssistantContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const block of content) {
      if (typeof block === "string") {
        texts.push(block);
      } else if (typeof block === "object" && block !== null && "text" in block) {
        texts.push((block as { text: string }).text);
      }
    }
    return texts.join("");
  }
  return "";
}
