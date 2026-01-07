import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { getOpenAIClient, ChatMessage } from "./api/openai";
import { memoTools, executeTool } from "./tools/memo-tools";
import {
  Conversation,
  saveConversation,
  createConversation,
  generateTitle,
} from "./storage/conversations";

interface Props {
  existingConversation?: Conversation;
}

const SYSTEM_PROMPT = `You are a helpful AI assistant that manages the user's memos. You have access to tools to search, create, update, and organize memos.

When the user asks about their notes or memos:
1. Use search_memos to find relevant content
2. Use list_recent_memos to show recent notes
3. Use create_memo to add new notes
4. Use update_memo to modify existing notes
5. Use organize_memos to help with organization

Always be concise and helpful. When showing memos, format them nicely. When creating memos, confirm what was created.`;

interface QAPair {
  id: string;
  question: string;
  answer: string;
  isStreaming: boolean;
}

export default function QuickAI(props: Props = {}) {
  const [conversation, setConversation] = useState<Conversation | null>(
    props.existingConversation || null,
  );
  const [query, setQuery] = useState("");
  const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pairIdCounter = useRef(0);

  const loadQAPairsFromConversation = (conv: Conversation) => {
    const userMsgs = conv.messages.filter((m) => m.role === "user");
    const assistantMsgs = conv.messages.filter(
      (m) => m.role === "assistant" && m.content,
    );

    const pairs: QAPair[] = [];
    for (let i = 0; i < userMsgs.length; i++) {
      pairs.push({
        id: `pair-${pairIdCounter.current++}`,
        question: userMsgs[i].content || "",
        answer: assistantMsgs[i]?.content || "",
        isStreaming: false,
      });
    }
    setQaPairs(pairs);
    if (pairs.length > 0) {
      setSelectedId(pairs[pairs.length - 1].id);
    }
  };

  useEffect(() => {
    if (!conversation) {
      createConversation().then((conv) => {
        setConversation(conv);
      });
    }
    if (props.existingConversation) {
      loadQAPairsFromConversation(props.existingConversation);
    }
  }, []);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!conversation || !userMessage.trim()) return;

      const client = getOpenAIClient();
      if (!client.isConfigured()) {
        showToast({
          style: Toast.Style.Failure,
          title: "OpenAI API not configured",
          message: "Please set your API key in extension preferences",
        });
        return;
      }

      const trimmedMessage = userMessage.trim();
      setQuery("");
      setIsLoading(true);

      // Create new pair for streaming
      const newPairId = `pair-${pairIdCounter.current++}`;
      const newPair: QAPair = {
        id: newPairId,
        question: trimmedMessage,
        answer: "",
        isStreaming: true,
      };

      setQaPairs((prev) => [...prev, newPair]);
      setTimeout(() => setSelectedId(newPairId), 2000);

      const newUserMessage: ChatMessage = {
        role: "user",
        content: trimmedMessage,
      };

      const updatedMessages = [...conversation.messages, newUserMessage];
      const updatedConversation: Conversation = {
        ...conversation,
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
        title:
          conversation.messages.length === 0
            ? generateTitle([newUserMessage])
            : conversation.title,
      };

      setConversation(updatedConversation);

      try {
        const messagesForAI: ChatMessage[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...updatedMessages,
        ];

        // Real implementation
        // Try streaming first
        try {
          showToast({
            style: Toast.Style.Animated,
            title: "Thinking...",
          });

          const stream = await client.chat(messagesForAI, { stream: true });
          let fullContent = "";

          showToast({
            style: Toast.Style.Animated,
            title: "Streaming response...",
          });

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              setQaPairs((prev) =>
                prev.map((p) =>
                  p.id === newPairId ? { ...p, answer: fullContent } : p,
                ),
              );
            }
          }

          // Mark streaming complete
          setQaPairs((prev) =>
            prev.map((p) =>
              p.id === newPairId ? { ...p, isStreaming: false } : p,
            ),
          );

          showToast({
            style: Toast.Style.Success,
            title: "Response complete",
          });

          // Save final message
          const finalMessages = [
            ...updatedMessages,
            { role: "assistant" as const, content: fullContent },
          ];

          const finalConversation: Conversation = {
            ...updatedConversation,
            messages: finalMessages,
            updatedAt: new Date().toISOString(),
          };

          setConversation(finalConversation);
          await saveConversation(finalConversation);
        } catch (streamError) {
          showToast({
            style: Toast.Style.Animated,
            title: "Using tools...",
          });

          // Fall back to non-streaming with tool support
          let response = await client.chat(messagesForAI, { tools: memoTools });
          let assistantMessage = response.choices[0].message;

          // Handle tool calls
          while (
            assistantMessage.tool_calls &&
            assistantMessage.tool_calls.length > 0
          ) {
            updatedMessages.push(assistantMessage);

            for (const toolCall of assistantMessage.tool_calls) {
              const args = JSON.parse(toolCall.function.arguments);
              setQaPairs((prev) =>
                prev.map((p) =>
                  p.id === newPairId
                    ? { ...p, answer: `*Using ${toolCall.function.name}...*` }
                    : p,
                ),
              );
              const result = await executeTool(toolCall.function.name, args);

              updatedMessages.push({
                role: "tool",
                content: result,
                tool_call_id: toolCall.id,
              });
            }

            const nextMessagesForAI: ChatMessage[] = [
              { role: "system", content: SYSTEM_PROMPT },
              ...updatedMessages,
            ];
            response = await client.chat(nextMessagesForAI, {
              tools: memoTools,
            });
            assistantMessage = response.choices[0].message;
          }

          const answer = assistantMessage.content || "";
          updatedMessages.push(assistantMessage);

          setQaPairs((prev) =>
            prev.map((p) =>
              p.id === newPairId ? { ...p, answer, isStreaming: false } : p,
            ),
          );

          showToast({
            style: Toast.Style.Success,
            title: "Response complete",
          });

          const finalConversation: Conversation = {
            ...updatedConversation,
            messages: updatedMessages,
            updatedAt: new Date().toISOString(),
          };

          setConversation(finalConversation);
          await saveConversation(finalConversation);
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to send message",
          message: String(error),
        });
        // Remove failed pair
        setQaPairs((prev) => prev.filter((p) => p.id !== newPairId));
      } finally {
        setIsLoading(false);
      }
    },
    [conversation],
  );

  const handleSubmit = () => {
    if (query.trim()) {
      sendMessage(query);
    }
  };

  const regenerate = useCallback(async () => {
    if (qaPairs.length === 0) return;

    const lastPair = qaPairs[qaPairs.length - 1];

    if (conversation) {
      const messages = [...conversation.messages];
      let lastUserIdx = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          lastUserIdx = i;
          break;
        }
      }
      if (lastUserIdx >= 0) {
        setConversation({
          ...conversation,
          messages: messages.slice(0, lastUserIdx),
        });
      }
    }

    setQaPairs((prev) => prev.slice(0, -1));
    await sendMessage(lastPair.question);
  }, [qaPairs, conversation, sendMessage]);

  const hasContent = qaPairs.length > 0;

  // Format markdown with streaming indicator
  const formatAnswer = (pair: QAPair) => {
    if (!pair.answer && pair.isStreaming) {
      return "*Thinking...*";
    }
    if (pair.isStreaming) {
      return pair.answer + " ●";
    }
    return pair.answer;
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={hasContent}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      selectedItemId={selectedId || undefined}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder={
        hasContent ? "Ask follow-up..." : "Ask AI anything..."
      }
    >
      {!hasContent ? (
        <List.EmptyView
          icon={Icon.Stars}
          title="Ask Anything"
          description="Type your question above and press Enter"
          actions={
            <ActionPanel>
              <Action
                title="Ask AI"
                icon={Icon.Stars}
                onAction={handleSubmit}
              />
            </ActionPanel>
          }
        />
      ) : (
        qaPairs.map((pair) => (
          <List.Item
            key={pair.id}
            id={pair.id}
            title={pair.question}
            icon={{
              source: pair.isStreaming ? Icon.CircleProgress : Icon.Message,
              tintColor: pair.isStreaming ? Color.Blue : Color.PrimaryText,
            }}
            detail={<List.Item.Detail markdown={formatAnswer(pair)} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Ask AI"
                    icon={Icon.Stars}
                    onAction={handleSubmit}
                  />
                </ActionPanel.Section>
                {pair.answer && !pair.isStreaming && (
                  <ActionPanel.Section>
                    <Action.Paste
                      title="Paste Response"
                      content={pair.answer}
                    />
                    <Action.CopyToClipboard
                      title="Copy Response"
                      content={pair.answer}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    {pair.id === qaPairs[qaPairs.length - 1]?.id && (
                      <Action
                        title="Regenerate"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={regenerate}
                      />
                    )}
                    <Action
                      title="New Conversation"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() => {
                        setQaPairs([]);
                        setSelectedId(null);
                        createConversation().then(setConversation);
                      }}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
