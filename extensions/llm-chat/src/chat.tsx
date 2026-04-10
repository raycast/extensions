import {
  Action,
  ActionPanel,
  Icon,
  List,
  confirmAlert,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useMemo, useRef, useState } from "react";
import { ChatMessage, createStreamRequest } from "./api";
import { getProviderConfig } from "./providers";
import { generateId, saveConversation } from "./storage";
import {
  formatThinking,
  parseFloatPref,
  parseIntPref,
  renderLatex,
  resolveModelName,
  rollThinking,
} from "./utils";

interface MessageItem {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
}

interface ConversationRound {
  id: string;
  messages: MessageItem[];
  createdAt: number;
}

function maybeRenderLatex(text: string, renderLatexMath: boolean): string {
  return renderLatexMath ? renderLatex(text) : text;
}

function renderRoundMessages(
  messages: MessageItem[],
  isLoading: boolean,
  showThinking: boolean,
  renderLatexMath: boolean
): string {
  if (messages.length === 0) {
    return "Start typing in the search bar above, then press **Enter** to send.";
  }

  return messages
    .map((message, index) => {
      const label = message.role === "user" ? "**You**" : "**Assistant**";
      let text = "";
      const isStreamingReasoning = isLoading && message.role === "assistant" && index === messages.length - 1;

      if (message.reasoning) {
        if (isStreamingReasoning || showThinking) {
          text += `${formatThinking(maybeRenderLatex(message.reasoning, renderLatexMath))}\n\n---\n\n`;
        } else {
          text += `> Thinking Process is hidden\n\n---\n\n`;
        }
      }

      if (message.content) {
        text += maybeRenderLatex(message.content, renderLatexMath);
      } else if (isLoading && message.role === "assistant") {
        text += "…";
      }

      return `${label}\n\n${text}`;
    })
    .join("\n\n---\n\n");
}

function getRoundTitle(messages: MessageItem[], fallback: string): string {
  const firstUserMessage = messages.find((message) => message.role === "user")?.content.trim();
  return firstUserMessage ? firstUserMessage.slice(0, 80) : fallback;
}

export default function Chat() {
  const prefs = getPreferenceValues<Preferences>();
  const providerConfig = getProviderConfig(prefs.provider);
  const modelName = resolveModelName(prefs.provider, prefs.model);

  const initialRoundId = useMemo(() => generateId(), []);
  const [archivedRounds, setArchivedRounds] = useState<ConversationRound[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState(initialRoundId);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState(initialRoundId);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showThinking, setShowThinking] = useState(!(prefs.defaultHideThinking ?? true));
  const [renderLatexMath, setRenderLatexMath] = useState(prefs.defaultRenderLatexMath ?? false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<MessageItem[]>([]);
  const isLoadingRef = useRef(false);
  const reasoningRef = useRef("");
  const reasoningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastReasoningFlushRef = useRef(0);
  const activeAssistantIndexRef = useRef<number | null>(null);
  const pendingSelectionRef = useRef<string | null>(null);

  messagesRef.current = messages;
  isLoadingRef.current = isLoading;

  const clearReasoningTimer = useCallback(() => {
    if (reasoningTimerRef.current) {
      clearTimeout(reasoningTimerRef.current);
      reasoningTimerRef.current = null;
    }
  }, []);

  const flushReasoningDisplay = useCallback(
    (assistantIndex: number) => {
      clearReasoningTimer();
      lastReasoningFlushRef.current = Date.now();

      setMessages((previous) => {
        const updated = [...previous];
        if (updated[assistantIndex]) {
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            reasoning: rollThinking(reasoningRef.current),
          };
        }
        return updated;
      });
    },
    [clearReasoningTimer]
  );

  const scheduleReasoningDisplay = useCallback(
    (assistantIndex: number) => {
      const elapsed = Date.now() - lastReasoningFlushRef.current;

      if (elapsed >= 150) {
        flushReasoningDisplay(assistantIndex);
        return;
      }

      if (reasoningTimerRef.current) {
        return;
      }

      reasoningTimerRef.current = setTimeout(() => flushReasoningDisplay(assistantIndex), 150 - elapsed);
    },
    [flushReasoningDisplay]
  );

  const finalizeStoppedResponse = useCallback(() => {
    const assistantIndex = activeAssistantIndexRef.current;
    clearReasoningTimer();

    if (assistantIndex === null) {
      return;
    }

    if (reasoningRef.current) {
      setMessages((previous) => {
        const updated = [...previous];
        if (updated[assistantIndex]) {
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            reasoning: reasoningRef.current,
          };
        }
        return updated;
      });
    }

    activeAssistantIndexRef.current = null;
    lastReasoningFlushRef.current = 0;
    abortRef.current = null;
  }, [clearReasoningTimer]);

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim() || isLoadingRef.current) return;

      const userMessage: MessageItem = { role: "user", content: userInput };
      const previousMessages = [...messagesRef.current];
      const nextMessages = [...previousMessages, userMessage];
      const assistantIndex = nextMessages.length;

      setSelectedRoundId(currentRoundId);
      setDraft("");
      reasoningRef.current = "";
      clearReasoningTimer();
      lastReasoningFlushRef.current = 0;
      activeAssistantIndexRef.current = assistantIndex;

      setMessages([...nextMessages, { role: "assistant", content: "", reasoning: "" }]);
      setIsLoading(true);
      isLoadingRef.current = true;

      const toast = await showToast({ style: Toast.Style.Animated, title: "Thinking…" });

      const controller = createStreamRequest(
        prefs.provider,
        prefs.apiKey,
        modelName,
        [
          ...previousMessages.map((message) => ({ role: message.role, content: message.content } as ChatMessage)),
          { role: "user", content: userInput },
        ],
        {
          onReasoning: (delta) => {
            reasoningRef.current += delta;
            scheduleReasoningDisplay(assistantIndex);
          },
          onContent: (delta) => {
            setMessages((previous) => {
              const updated = [...previous];
              if (updated[assistantIndex]) {
                updated[assistantIndex] = {
                  ...updated[assistantIndex],
                  content: (updated[assistantIndex].content || "") + delta,
                };
              }
              return updated;
            });
            toast.message = "Responding…";
          },
          onComplete: async (reasoning, content) => {
            clearReasoningTimer();
            reasoningRef.current = reasoning;
            activeAssistantIndexRef.current = null;
            abortRef.current = null;
            lastReasoningFlushRef.current = 0;

            setMessages((previous) => {
              const updated = [...previous];
              if (updated[assistantIndex]) {
                updated[assistantIndex] = {
                  role: "assistant",
                  content,
                  reasoning: reasoning || undefined,
                };
              }
              return updated;
            });
            setIsLoading(false);
            isLoadingRef.current = false;
            toast.style = Toast.Style.Success;
            toast.title = "Complete";

            try {
              await saveConversation({
                id: generateId(),
                provider: prefs.provider,
                model: modelName,
                messages: [...nextMessages, { role: "assistant", content, reasoning: reasoning || undefined }],
                createdAt: Date.now(),
              });
            } catch {
              // Saving failed — response is still visible in the chat
            }
          },
          onError: (error) => {
            clearReasoningTimer();
            reasoningRef.current = "";
            activeAssistantIndexRef.current = null;
            abortRef.current = null;
            lastReasoningFlushRef.current = 0;
            setIsLoading(false);
            isLoadingRef.current = false;
            showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
            setMessages((previous) => previous.slice(0, assistantIndex));
          },
        },
        prefs.customBaseUrl,
        parseFloatPref(prefs.temperature),
        parseIntPref(prefs.maxTokens),
        prefs.thinkingEnabled
      );

      abortRef.current = controller;
    },
    [clearReasoningTimer, currentRoundId, modelName, prefs, scheduleReasoningDisplay]
  );

  const startNewConversation = useCallback(() => {
    if (isLoadingRef.current || messagesRef.current.length === 0) {
      return;
    }

    const archivedRound: ConversationRound = {
      id: currentRoundId,
      messages: messagesRef.current,
      createdAt: Date.now(),
    };
    const nextRoundId = generateId();

    setArchivedRounds((previous) => [archivedRound, ...previous]);
    setCurrentRoundId(nextRoundId);
    pendingSelectionRef.current = nextRoundId;
    setSelectedRoundId(nextRoundId);
    setMessages([]);
    messagesRef.current = [];
    setDraft("");
    reasoningRef.current = "";
    activeAssistantIndexRef.current = null;
    lastReasoningFlushRef.current = 0;
  }, [currentRoundId]);

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    isLoadingRef.current = false;
    finalizeStoppedResponse();
  }, [finalizeStoppedResponse]);

  const clearChat = useCallback(async () => {
    const ok = await confirmAlert({
      title: "Clear Chat",
      message: "Clear all conversations?",
      icon: Icon.Trash,
      primaryAction: { title: "Clear" },
    });

    if (ok) {
      const nextRoundId = generateId();
      clearReasoningTimer();
      reasoningRef.current = "";
      abortRef.current = null;
      activeAssistantIndexRef.current = null;
      lastReasoningFlushRef.current = 0;
      setDraft("");
      setArchivedRounds([]);
      setMessages([]);
      messagesRef.current = [];
      setCurrentRoundId(nextRoundId);
      pendingSelectionRef.current = nextRoundId;
      setSelectedRoundId(nextRoundId);
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [clearReasoningTimer]);

  const rounds: Array<ConversationRound & { isCurrent: boolean }> = [
    { id: currentRoundId, messages, createdAt: Date.now(), isCurrent: true },
    ...archivedRounds.map((round) => ({ ...round, isCurrent: false })),
  ];

  const selectedRound = rounds.find((round) => round.id === selectedRoundId) ?? rounds[0];
  const hasThinking = rounds.some((round) => round.messages.some((message) => Boolean(message.reasoning)));
  const lastAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant") ?? null;
  const copyContent = lastAssistantMessage?.reasoning
    ? `${formatThinking(lastAssistantMessage.reasoning)}\n\n---\n\n${lastAssistantMessage.content}`
    : lastAssistantMessage?.content || "";
  const hasAnyConversation = archivedRounds.length > 0 || messages.length > 0;

  return (
    <List
      filtering={false}
      isShowingDetail
      onSearchTextChange={setDraft}
      onSelectionChange={(id) => {
        if (pendingSelectionRef.current) {
          if (id === pendingSelectionRef.current) {
            pendingSelectionRef.current = null;
          }
          return;
        }
        setSelectedRoundId(id ?? currentRoundId);
      }}
      searchBarPlaceholder="Type your message"
      searchText={draft}
      selectedItemId={selectedRound?.id}
      throttle={false}
      navigationTitle={`Chat · ${providerConfig.name} (${modelName})`}
    >
      {rounds.map((round, index) => {
        const title = getRoundTitle(
          round.messages,
          round.isCurrent ? "Current Conversation" : `Conversation ${archivedRounds.length - index + 1}`
        );
        const subtitle = round.isCurrent
          ? `${providerConfig.name} (${modelName}) · ${round.messages.length} messages · current`
          : `${providerConfig.name} (${modelName}) · ${round.messages.length} messages`;
        const detailMarkdown = renderRoundMessages(
          round.messages,
          round.isCurrent && isLoading,
          showThinking,
          renderLatexMath
        );

        return (
          <List.Item
            key={round.id}
            id={round.id}
            icon={Icon.SpeechBubble}
            title={title}
            subtitle={subtitle}
            detail={<List.Item.Detail markdown={detailMarkdown} />}
            actions={
              <ActionPanel>
                {!isLoading ? (
                  <Action title="Send Message" icon={Icon.ArrowRight} onAction={() => sendMessage(draft)} />
                ) : (
                  <Action
                    title="Stop Generating"
                    icon={Icon.Stop}
                    onAction={stopGenerating}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                )}
                {messages.length > 0 && !isLoading && (
                  <Action
                    title="Start New Conversation"
                    icon={Icon.PlusCircle}
                    onAction={startNewConversation}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                )}
                {lastAssistantMessage && lastAssistantMessage.content && round.isCurrent && (
                  <Action.CopyToClipboard
                    title="Copy Last Response"
                    content={copyContent}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                )}
                {lastAssistantMessage?.reasoning && round.isCurrent && (
                  <Action.CopyToClipboard
                    title="Copy Without Thinking"
                    content={lastAssistantMessage.content}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                )}
                {hasThinking && (
                  <Action
                    title={showThinking ? "Hide Thinking" : "Show Thinking"}
                    icon={showThinking ? Icon.EyeDisabled : Icon.Eye}
                    onAction={() => setShowThinking((value) => !value)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  />
                )}
                <Action
                  title={renderLatexMath ? "Do Not Render Latex Math" : "Render Latex Math"}
                  icon={renderLatexMath ? Icon.XMarkCircle : Icon.Calculator}
                  onAction={() => setRenderLatexMath((value) => !value)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                />
                {hasAnyConversation && !isLoading && (
                  <Action
                    title="Clear Chat"
                    icon={Icon.Trash}
                    onAction={clearChat}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                )}
                <Action
                  title="Configure Extension"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                  shortcut={{ modifiers: ["cmd"], key: "," }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
