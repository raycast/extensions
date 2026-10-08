import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Image,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Chat,
  ChatMessage,
  fetchChat,
  fetchChats,
  fetchModels,
  Model,
  streamChat,
} from "./api";

function getModelIcon(model: Model): Image.ImageLike {
  const providerIcons: Record<string, { light: string; dark: string }> = {
    openai: { light: "openai_light.png", dark: "openai_dark.png" },
    anthropic: { light: "anthropic_light.png", dark: "anthropic_dark.png" },
    google: { light: "gemini_light.png", dark: "gemini_dark.png" },
    xai: { light: "grok_light.png", dark: "grok_dark.png" },
    moonshotai: { light: "moonshot_light.png", dark: "moonshot_dark.png" },
    qwen: { light: "qwen_light.png", dark: "qwen_dark.png" },
    zai: { light: "zai_light.png", dark: "zai_dark.png" },
    deepseek: { light: "deepseek_light.png", dark: "deepseek_dark.png" },
    minimax: { light: "minimax_light.png", dark: "minimax_dark.png" },
  };

  const icon = providerIcons[model.aiSdk];
  if (icon) {
    return { source: { light: icon.light, dark: icon.dark } };
  }

  if (model.hasImageGeneration) return Icon.Image;
  if (model.isFast) return Icon.Bolt;
  if (model.hasReasoning) return Icon.LightBulb;
  return Icon.ComputerChip;
}

export default function AskCommand() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadChats() {
      try {
        const fetchedChats = await fetchChats();
        setChats(fetchedChats);
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load chats",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadChats();
  }, []);

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search chats...">
      <List.Section title="Actions">
        <List.Item
          title="New Chat"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Start New Chat"
                target={<NewChatForm />}
                icon={Icon.Plus}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {chats.length > 0 && (
        <List.Section title="Recent Chats">
          {chats.map((chat) => (
            <List.Item
              key={chat.id}
              title={chat.name}
              subtitle={chat.modelName}
              icon={chat.isPinned ? Icon.Pin : Icon.Message}
              accessories={[{ text: formatDate(chat.updatedAt) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Continue Chat"
                    target={<ChatView chatId={chat.id} chatName={chat.name} />}
                    icon={Icon.Message}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function NewChatForm() {
  const [question, setQuestion] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function loadModels() {
      try {
        const fetchedModels = await fetchModels();
        setModels(fetchedModels);
        const defaultModel = fetchedModels.find((m) => m.isDefault);
        if (defaultModel) {
          setSelectedModelId(defaultModel.id);
        } else if (fetchedModels.length > 0) {
          setSelectedModelId(fetchedModels[0].id);
        }
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load models",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setIsLoadingModels(false);
      }
    }
    loadModels();
  }, []);

  const handleSubmit = useCallback(
    async (values: { question: string; model: string }) => {
      if (!values.question.trim()) {
        showToast({
          style: Toast.Style.Failure,
          title: "Please enter a question",
        });
        return;
      }

      push(
        <ChatView initialQuestion={values.question} modelId={values.model} />,
      );
    },
    [push],
  );

  return (
    <Form
      isLoading={isLoadingModels}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            onSubmit={handleSubmit}
            icon={Icon.Message}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="Ask anything about job hunting, interviews, or career advice..."
        value={question}
        onChange={setQuestion}
        enableMarkdown
      />
      <Form.Dropdown
        id="model"
        title="Model"
        value={selectedModelId}
        onChange={setSelectedModelId}
      >
        {models.map((model) => (
          <Form.Dropdown.Item
            key={model.id}
            value={model.id}
            title={model.displayName}
            icon={getModelIcon(model)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  modelName?: string;
  imageUrl?: string;
};

function formatTime(date?: Date): string {
  if (!date) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatView({
  chatId: initialChatId,
  chatName: initialChatName,
  initialQuestion,
  modelId,
}: {
  chatId?: string;
  chatName?: string;
  initialQuestion?: string;
  modelId?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(!!initialChatId);
  const [error, setError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(initialChatId || null);
  const [chatName, setChatName] = useState<string | null>(
    initialChatName || null,
  );
  const [model, setModel] = useState<string | null>(null);
  const { push } = useNavigation();

  // Load existing chat messages
  useEffect(() => {
    if (initialChatId) {
      (async () => {
        try {
          const chat = await fetchChat(initialChatId);
          setChatName(chat.name);
          setModel(chat.modelName || null);
          setMessages(
            chat.messages.map((m: ChatMessage) => ({
              role: m.role,
              content: m.content,
              timestamp: new Date(m.createdAt),
            })),
          );
        } catch (err) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load chat",
            message: err instanceof Error ? err.message : "Unknown error",
          });
        } finally {
          setIsLoadingHistory(false);
        }
      })();
    }
  }, [initialChatId]);

  const [currentModelId, setCurrentModelId] = useState<string | undefined>(
    modelId,
  );
  const hasSentInitialQuestion = useRef(false);

  const sendMessage = useCallback(
    async (question: string, newModelId?: string) => {
      setIsLoading(true);
      setError(null);
      setCurrentAnswer("");

      const effectiveModelId = newModelId || currentModelId;
      if (newModelId) {
        setCurrentModelId(newModelId);
      }

      // Add user message to history
      const userTimestamp = new Date();
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question, timestamp: userTimestamp },
      ]);

      try {
        const generator = streamChat(question, {
          chatId: chatId || undefined,
          modelId: effectiveModelId,
        });
        let fullAnswer = "";

        let result = await generator.next();
        while (!result.done) {
          if (result.value) {
            fullAnswer += result.value;
            setCurrentAnswer(fullAnswer);
          }
          result = await generator.next();
        }

        let responseModel = model;
        let responseImageUrl: string | undefined;
        if (result.value) {
          if (result.value.chatId) {
            setChatId(result.value.chatId);
          }
          setModel(result.value.model);
          responseModel = result.value.model;
          responseImageUrl = result.value.imageUrl;
        }

        // Add assistant message to history
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: fullAnswer,
            timestamp: new Date(),
            modelName: responseModel || undefined,
            imageUrl: responseImageUrl,
          },
        ]);
        setCurrentAnswer("");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [chatId, currentModelId, model],
  );

  // Send initial question on mount (for new chats)
  useEffect(() => {
    if (initialQuestion && !initialChatId && !hasSentInitialQuestion.current) {
      hasSentInitialQuestion.current = true;
      sendMessage(initialQuestion);
    }
  }, [initialQuestion, initialChatId, sendMessage]);

  const handleFollowUp = useCallback(() => {
    push(
      <FollowUpForm onSubmit={sendMessage} currentModelId={currentModelId} />,
    );
  }, [push, sendMessage, currentModelId]);

  // Build markdown content - newest at top for visibility
  let markdown = "";
  if (chatName) {
    markdown += `# ${chatName}\n\n`;
  }

  // Show current streaming response first (at top)
  if (currentAnswer) {
    const modelLabel = model ? ` · ${model}` : "";
    markdown += `## 🤖 Assistant${modelLabel}\n\n${currentAnswer}\n\n---\n\n`;
  } else if (isLoading && messages.length > 0) {
    const modelLabel = model ? ` · ${model}` : "";
    markdown += `## 🤖 Assistant${modelLabel}\n\n_Thinking..._\n\n---\n\n`;
  }

  // Show the most recent user message if we're loading
  if (isLoading && messages.length > 0) {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      const time = formatTime(lastUserMsg.timestamp);
      markdown += `## 👤 You ${time ? `· ${time}` : ""}\n\n${lastUserMsg.content}\n\n---\n\n`;
    }
  }

  // Show message history (newest first, excluding the ones shown above)
  const historyMessages = isLoading
    ? messages.slice(0, -1).reverse() // Exclude last user message when loading
    : [...messages].reverse();

  if (historyMessages.length > 0) {
    markdown += `### Previous Messages\n\n`;
    for (const msg of historyMessages) {
      const time = formatTime(msg.timestamp);
      const timeStr = time ? ` · ${time}` : "";
      if (msg.role === "user") {
        markdown += `**👤 You${timeStr}**\n\n${msg.content}\n\n---\n\n`;
      } else {
        const modelStr =
          msg.modelName || model ? ` · ${msg.modelName || model}` : "";
        markdown += `**🤖 Assistant${timeStr}${modelStr}**\n\n${msg.content}\n\n---\n\n`;
      }
    }
  }

  if (error) {
    markdown = `**❌ Error:** ${error}\n\n` + markdown;
  }

  return (
    <Detail
      markdown={markdown || "_Start a conversation..._"}
      isLoading={isLoading || isLoadingHistory}
      actions={
        <ActionPanel>
          {!isLoading && (
            <Action
              title="Follow up"
              icon={Icon.Message}
              onAction={handleFollowUp}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Last Answer"
            content={
              messages.filter((m) => m.role === "assistant").pop()?.content ||
              ""
            }
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {messages.filter((m) => m.role === "assistant" && m.imageUrl).pop()
            ?.imageUrl && (
            <>
              <Action.OpenInBrowser
                title="Open Image in Browser"
                url={
                  messages
                    .filter((m) => m.role === "assistant" && m.imageUrl)
                    .pop()?.imageUrl || ""
                }
                icon={Icon.Image}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.CopyToClipboard
                title="Copy Image URL"
                content={
                  messages
                    .filter((m) => m.role === "assistant" && m.imageUrl)
                    .pop()?.imageUrl || ""
                }
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
            </>
          )}
          <Action.CopyToClipboard
            title="Copy Full Conversation"
            content={messages
              .map(
                (m) =>
                  `${m.role === "user" ? "You" : "Assistant"}: ${m.content}`,
              )
              .join("\n\n")}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function FollowUpForm({
  onSubmit,
  currentModelId,
}: {
  onSubmit: (question: string, modelId?: string) => void;
  currentModelId?: string;
}) {
  const [question, setQuestion] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>(
    currentModelId || "",
  );
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const { pop } = useNavigation();

  useEffect(() => {
    async function loadModels() {
      try {
        const fetchedModels = await fetchModels();
        setModels(fetchedModels);
        if (!currentModelId) {
          const defaultModel = fetchedModels.find((m) => m.isDefault);
          if (defaultModel) {
            setSelectedModelId(defaultModel.id);
          } else if (fetchedModels.length > 0) {
            setSelectedModelId(fetchedModels[0].id);
          }
        }
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load models",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setIsLoadingModels(false);
      }
    }
    loadModels();
  }, [currentModelId]);

  const handleSubmit = useCallback(
    (values: { question: string; model: string }) => {
      if (!values.question.trim()) {
        showToast({
          style: Toast.Style.Failure,
          title: "Please enter a question",
        });
        return;
      }
      pop();
      onSubmit(values.question, values.model);
    },
    [onSubmit, pop],
  );

  return (
    <Form
      isLoading={isLoadingModels}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send"
            onSubmit={handleSubmit}
            icon={Icon.Message}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Follow-up"
        placeholder="Ask a follow-up question..."
        value={question}
        onChange={setQuestion}
        enableMarkdown
      />
      <Form.Dropdown
        id="model"
        title="Model"
        value={selectedModelId}
        onChange={setSelectedModelId}
      >
        {models.map((model) => (
          <Form.Dropdown.Item
            key={model.id}
            value={model.id}
            title={model.displayName}
            icon={getModelIcon(model)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
