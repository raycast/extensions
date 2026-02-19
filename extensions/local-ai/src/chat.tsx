import {
  Detail,
  List,
  ActionPanel,
  Action,
  Form,
  Icon,
  Color,
  Toast,
  showToast,
  Clipboard,
  LocalStorage,
  useNavigation,
  LaunchProps,
  openExtensionPreferences,
  open,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { homedir } from "os";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import {
  getProviderConfig,
  fetchModels,
  sendChatStream,
  trimMessages,
  PROVIDER_NAMES,
} from "./lib/api";
import { parseSSEStream } from "./lib/streaming";
import { webSearch, formatSearchContext, shouldSearch } from "./lib/web-search";
import { BUILT_IN_TOOLS, runWithTools } from "./lib/tools";
import {
  saveConversation,
  getConversation,
  generateId,
  generateTitle,
} from "./lib/storage";
import type {
  ChatMessage,
  ProviderConfig,
  Model,
  Conversation,
} from "./lib/types";
import { PROMPT_PRESETS } from "./lib/prompts";
import { useOnboarding } from "./lib/use-onboarding";
import { OnboardingForm } from "./onboarding-form";
import { readClipboardImage } from "./lib/screenshot";

interface ChatLaunchContext {
  conversationId?: string;
  model?: string;
  initialQuestion?: string;
  initialResponse?: string;
  pendingImage?: string;
  prefillText?: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  ollama: "Ollama",
  lmstudio: "LM Studio",
  llamacpp: "llama.cpp",
  custom: "Custom",
};

/** Pushed view for picking a different model mid-conversation. */
function ModelSelector({
  models,
  onSelect,
}: {
  models: Model[];
  onSelect: (modelId: string) => void;
}) {
  const { pop } = useNavigation();

  return (
    <List searchBarPlaceholder="Search models...">
      {models.map((model) => (
        <List.Item
          key={model.id}
          title={model.id}
          subtitle={model.owned_by}
          icon={Icon.ComputerChip}
          actions={
            <ActionPanel>
              <Action
                title="Select Model"
                icon={Icon.Checkmark}
                onAction={() => {
                  onSelect(model.id);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/** Session-level parameter overrides (not persisted to preferences). */
interface SessionOverrides {
  temperature: number | null;
  maxTokens: number | null;
  systemPrompt: string | null;
}

/** Pushed form for adjusting chat parameters for the current session only. */
function ChatSettingsForm({
  current,
  onApply,
  showModelField,
  currentModel,
  onModelChange,
}: {
  current: { temperature: number; maxTokens: number; systemPrompt: string };
  onApply: (overrides: Partial<SessionOverrides>) => void;
  showModelField?: boolean;
  currentModel?: string;
  onModelChange?: (model: string) => void;
}) {
  const { pop } = useNavigation();
  const [systemPrompt, setSystemPrompt] = useState(current.systemPrompt);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Settings"
            icon={Icon.Checkmark}
            onSubmit={(values: {
              temperature: string;
              maxTokens: string;
              systemPrompt: string;
              modelName?: string;
            }) => {
              const overrides: Partial<SessionOverrides> = {};
              const tempVal = parseFloat(values.temperature);
              if (!isNaN(tempVal)) overrides.temperature = tempVal;
              const tokVal = parseInt(values.maxTokens, 10);
              if (!isNaN(tokVal)) overrides.maxTokens = tokVal;
              if (values.systemPrompt !== undefined) {
                overrides.systemPrompt = values.systemPrompt.trim() || null;
              }
              if (values.modelName?.trim() && onModelChange) {
                onModelChange(values.modelName.trim());
              }
              onApply(overrides);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="preset"
        title="System Prompt Preset"
        info="Select a preset to populate the system prompt, then edit as needed"
        onChange={(presetId) => {
          const preset = PROMPT_PRESETS.find((p) => p.id === presetId);
          if (preset) {
            setSystemPrompt(preset.prompt);
          }
        }}
      >
        {PROMPT_PRESETS.map((preset) => (
          <Form.Dropdown.Item
            key={preset.id}
            value={preset.id}
            title={preset.name}
            icon={preset.icon}
          />
        ))}
      </Form.Dropdown>
      {showModelField && (
        <Form.TextField
          id="modelName"
          title="Model Name"
          placeholder="e.g. llama3.2"
          defaultValue={currentModel || ""}
          info="Type a model name manually if no models were auto-detected"
        />
      )}
      <Form.TextField
        id="temperature"
        title="Temperature"
        placeholder="0.7"
        defaultValue={String(current.temperature)}
        info="Controls response creativity (0.0 = focused, 2.0 = creative)"
      />
      <Form.TextField
        id="maxTokens"
        title="Max Tokens"
        placeholder="2048"
        defaultValue={String(current.maxTokens)}
        info="Maximum number of tokens in the response"
      />
      <Form.TextArea
        id="systemPrompt"
        title="System Prompt"
        placeholder="Optional system prompt for this session..."
        value={systemPrompt}
        onChange={setSystemPrompt}
        info="Overrides the global system prompt for this chat session only"
      />
    </Form>
  );
}

/** Render the full conversation as a single markdown string. */
function buildConversationMarkdown(
  messages: ChatMessage[],
  currentResponse: string,
  isLoading: boolean,
  modelLabel: string,
  providerLabel: string,
): string {
  const visibleMessages = messages.filter((m) => m.role !== "system");

  // Empty state
  if (visibleMessages.length === 0 && !isLoading) {
    return `# Chat with ${modelLabel}\n\n**Provider:** ${providerLabel}\n\nPress **Enter** to send your first message.`;
  }

  const parts: string[] = [];
  parts.push(`*${modelLabel} on ${providerLabel}*\n`);

  for (const msg of visibleMessages) {
    if (msg.role === "user") {
      const imgSection =
        msg.images && msg.images.length > 0
          ? msg.images.map((p) => `![Image](${p})`).join("\n\n") + "\n\n"
          : "";
      const textSection = msg.content
        ? `> ${msg.content.split("\n").join("\n> ")}`
        : "";
      parts.push(`---\n\n> **You**\n>\n${imgSection}${textSection}\n`);
    } else {
      parts.push(`---\n\n**Assistant**\n\n${msg.content}\n`);
    }
  }

  // Streaming response
  if (isLoading && currentResponse) {
    parts.push(
      `---\n\n**Assistant**\n\n${currentResponse}\n\n*Generating\u2026*\n`,
    );
  } else if (isLoading && !currentResponse) {
    parts.push(`---\n\n*Thinking\u2026*\n`);
  }

  return parts.join("\n");
}

/** Build a clean markdown document for file export. */
function buildExportMarkdown(
  messages: ChatMessage[],
  modelLabel: string,
  providerLabel: string,
): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const lines: string[] = [];

  const firstUserMsg = messages.find((m) => m.role === "user");
  const title = firstUserMsg
    ? firstUserMsg.content.slice(0, 60).replace(/\n/g, " ")
    : "Conversation";
  lines.push(`# ${title}\n`);
  lines.push(
    `**Model:** ${modelLabel}  \n**Provider:** ${providerLabel}  \n**Date:** ${date}\n`,
  );
  lines.push(`---\n`);

  for (const msg of messages) {
    if (msg.role === "system") continue;
    const role = msg.role === "user" ? "You" : "Assistant";
    lines.push(`## ${role}\n\n${msg.content}\n\n---\n`);
  }

  return lines.join("\n");
}

/** Truncate text for list item subtitles. */
function truncate(text: string, max: number): string {
  const oneLine = text.replace(/\n/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max) + "\u2026";
}

/** Sanitize a string for use as a filename. */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .toLowerCase();
}

function ChatView(props: LaunchProps<{ launchContext?: ChatLaunchContext }>) {
  const { push } = useNavigation();
  const launchContext = props.launchContext;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [currentModel, setCurrentModel] = useState("");
  const [conversationId, setConversationId] = useState(generateId());
  const [createdAt, setCreatedAt] = useState(Date.now());
  const [initError, setInitError] = useState("");
  const [initDone, setInitDone] = useState(false);
  const contextHandled = useRef(false);

  // Search bar text = message input
  const [searchText, setSearchText] = useState("");

  // Web search state
  const [isSearching, setIsSearching] = useState(false);

  // Ref to latest messages state — avoids stale closures in handleSendMessage
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Auto-send image from launch context (screenshot commands)
  const autoSendImageRef = useRef<string | null>(null);

  // Auto-scroll: track whether user has manually scrolled up
  const userScrolledRef = useRef(false);

  // Session-only parameter overrides (null = use global config value)
  const [sessionOverrides, setSessionOverrides] = useState<SessionOverrides>({
    temperature: null,
    maxTokens: null,
    systemPrompt: null,
  });

  const effectiveTemperature =
    sessionOverrides.temperature ?? config?.temperature ?? 0.7;
  const effectiveMaxTokens =
    sessionOverrides.maxTokens ?? config?.maxTokens ?? 2048;
  const effectiveSystemPrompt =
    sessionOverrides.systemPrompt ?? config?.systemPrompt ?? "";

  // ── Initialise ──
  useEffect(() => {
    (async () => {
      const providerConfig = await getProviderConfig();
      setConfig(providerConfig);

      // Handle pending image/text from launch context (set early, before returns)
      if (launchContext?.pendingImage) {
        autoSendImageRef.current = launchContext.pendingImage;
      }
      if (launchContext?.prefillText) {
        setSearchText(launchContext.prefillText);
      }

      try {
        const modelList = await fetchModels(providerConfig);
        setModels(modelList);

        if (modelList.length === 0) {
          const providerName =
            PROVIDER_NAMES[providerConfig.type] || providerConfig.type;
          await showToast({
            style: Toast.Style.Animated,
            title: "No Models Found",
            message: `No models from ${providerName}. Use Chat Settings to set a model name.`,
          });
        }

        const storedDefault =
          await LocalStorage.getItem<string>("default_model");
        if (
          storedDefault &&
          modelList.length > 0 &&
          !modelList.some((m) => m.id === storedDefault)
        ) {
          await LocalStorage.removeItem("default_model");
        }

        const validStoredDefault =
          storedDefault &&
          (modelList.length === 0 ||
            modelList.some((m) => m.id === storedDefault))
            ? storedDefault
            : undefined;

        const contextModel = launchContext?.model;
        const model =
          contextModel ||
          validStoredDefault ||
          providerConfig.defaultModel ||
          modelList[0]?.id ||
          "";
        setCurrentModel(model);

        if (!contextHandled.current && launchContext?.conversationId) {
          contextHandled.current = true;
          const loaded = await getConversation(launchContext.conversationId);
          if (loaded) {
            setMessages(loaded.messages);
            setConversationId(loaded.id);
            setCreatedAt(loaded.createdAt);
            setCurrentModel(loaded.model || model);
            setInitDone(true);
            return;
          }
        }

        if (!contextHandled.current && launchContext?.initialQuestion) {
          contextHandled.current = true;
          const initialMessages: ChatMessage[] = [
            { role: "user", content: launchContext.initialQuestion },
          ];
          if (launchContext.initialResponse) {
            initialMessages.push({
              role: "assistant",
              content: launchContext.initialResponse,
            });
          }
          setMessages(initialMessages);
          setInitDone(true);
          return;
        }

        contextHandled.current = true;
        setInitDone(true);
      } catch (err) {
        contextHandled.current = true;
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setInitError(errorMessage);
        setInitDone(true);
        await showToast({
          style: Toast.Style.Failure,
          title: "Connection Failed",
          message: errorMessage,
          primaryAction: {
            title: "Open Settings",
            onAction: () => openExtensionPreferences(),
          },
        });
      }
    })();
  }, []);

  // ── Send a message and stream the response ──
  const handleSendMessage = useCallback(
    async (userInput: string, images?: string[]) => {
      if (!config || isLoading) return;
      const text = userInput.trim();
      const hasImages = images && images.length > 0;
      if (!text && !hasImages) return;

      const userMessage: ChatMessage = {
        role: "user",
        content: text || (hasImages ? "What's in this image?" : ""),
        images: hasImages ? images : undefined,
      };
      const updatedMessages = [...messagesRef.current, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);
      setCurrentResponse("");
      setSearchText("");
      userScrolledRef.current = false;

      const requestMessages: ChatMessage[] = [];
      if (effectiveSystemPrompt) {
        requestMessages.push({
          role: "system",
          content: effectiveSystemPrompt,
        });
      }

      const prefs = getPreferenceValues<Preferences>();
      const useToolCalling = prefs.toolCallingEnabled && prefs.webSearchEnabled;

      // Tier 1: Prompt-based web search (inject context before LLM call)
      if (!useToolCalling && prefs.webSearchEnabled && shouldSearch(text)) {
        setIsSearching(true);
        try {
          const results = await webSearch(text);
          if (results.length > 0) {
            const context = formatSearchContext(results);
            requestMessages.push({
              role: "system",
              content: `Here are relevant web search results. Use them to inform your answer, cite sources when relevant:\n\n${context}`,
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Search failed";
          await showToast({
            style: Toast.Style.Failure,
            title: "Web Search Failed",
            message: msg,
          });
        } finally {
          setIsSearching(false);
        }
      }

      requestMessages.push(...updatedMessages);
      const trimmedMessages = trimMessages(requestMessages);

      let fullResponse = "";
      try {
        let stream: ReadableStream;

        if (useToolCalling) {
          // Tier 2: Native tool calling — model decides when to search
          const result = await runWithTools(
            config,
            {
              model: currentModel,
              messages: trimmedMessages,
              temperature: effectiveTemperature,
              max_tokens: effectiveMaxTokens,
            },
            BUILT_IN_TOOLS,
          );
          stream = result.stream;
        } else {
          // Tier 1 or no search: direct streaming
          stream = await sendChatStream(config, {
            model: currentModel,
            messages: trimmedMessages,
            temperature: effectiveTemperature,
            max_tokens: effectiveMaxTokens,
          });
        }

        let lastFlush = Date.now();
        for await (const token of parseSSEStream(stream)) {
          fullResponse += token;
          const now = Date.now();
          if (now - lastFlush >= 100) {
            setCurrentResponse(fullResponse);
            lastFlush = now;
          }
        }
        // Final flush to ensure all content is rendered
        setCurrentResponse(fullResponse);

        // Detect empty response when images were attached — likely a non-vision model
        if (!fullResponse.trim() && hasImages) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No Response Received",
            message:
              "Does this model support image input? Try a vision model like Qwen3-VL-4B.",
          });
          setIsLoading(false);
          return;
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: fullResponse,
        };
        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);
        setCurrentResponse("");

        const conversation: Conversation = {
          id: conversationId,
          title: generateTitle(finalMessages),
          messages: finalMessages,
          model: currentModel,
          createdAt,
          updatedAt: Date.now(),
        };
        try {
          await saveConversation(conversation);
        } catch (saveErr) {
          console.error("[chat] Failed to save conversation:", saveErr);
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not save conversation",
            message: "Response is visible but may not persist",
          });
        }
      } catch (err) {
        if (fullResponse) {
          const partialMessage: ChatMessage = {
            role: "assistant",
            content: fullResponse,
          };
          const partialMessages = [...updatedMessages, partialMessage];
          setMessages(partialMessages);
          setCurrentResponse("");

          const conversation: Conversation = {
            id: conversationId,
            title: generateTitle(partialMessages),
            messages: partialMessages,
            model: currentModel,
            createdAt,
            updatedAt: Date.now(),
          };
          try {
            await saveConversation(conversation);
          } catch {
            console.error("[chat] Failed to save partial conversation");
          }

          await showToast({
            style: Toast.Style.Failure,
            title: "Response Interrupted",
            message: "Partial response saved",
          });
        } else {
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";
          const imageHint = hasImages
            ? " Does this model support image input? Try a vision model like Qwen3-VL-4B."
            : "";
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: errorMessage + imageHint,
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      config,
      currentModel,
      isLoading,
      conversationId,
      createdAt,
      effectiveTemperature,
      effectiveMaxTokens,
      effectiveSystemPrompt,
    ],
  );

  // Auto-send image from screenshot commands after init completes
  useEffect(() => {
    if (!autoSendImageRef.current || !initDone || !config || isLoading) return;
    const imagePath = autoSendImageRef.current;
    autoSendImageRef.current = null;
    handleSendMessage("", [imagePath]);
  }, [initDone, config, isLoading, handleSendMessage]);

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setCurrentResponse("");
    setSearchText("");
    setConversationId(generateId());
    setCreatedAt(Date.now());
    setIsLoading(false);
    setSessionOverrides({
      temperature: null,
      maxTokens: null,
      systemPrompt: null,
    });
  }, []);

  const handleCopyLastResponse = useCallback(async () => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAssistant) {
      await Clipboard.copy(lastAssistant.content);
      await showToast({ style: Toast.Style.Success, title: "Copied" });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Response to Copy",
      });
    }
  }, [messages]);

  const handleSaveConversation = useCallback(async () => {
    if (messages.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing to Save" });
      return;
    }
    const conversation: Conversation = {
      id: conversationId,
      title: generateTitle(messages),
      messages,
      model: currentModel,
      createdAt,
      updatedAt: Date.now(),
    };
    await saveConversation(conversation);
    await showToast({ style: Toast.Style.Success, title: "Saved" });
  }, [messages, conversationId, currentModel, createdAt]);

  const providerLabel = config
    ? PROVIDER_LABELS[config.type] || config.type
    : "";
  const modelLabel = currentModel || "Not set";

  // Build conversation markdown (memoized to avoid rebuilding on unrelated re-renders)
  const conversationMarkdown = useMemo(
    () =>
      buildConversationMarkdown(
        messages,
        currentResponse,
        isLoading,
        modelLabel,
        providerLabel,
      ),
    [messages, currentResponse, isLoading, modelLabel, providerLabel],
  );

  // Shared action panel
  const actions = (
    <ActionPanel>
      <Action
        title="Send Message"
        icon={Icon.Message}
        onAction={() => handleSendMessage(searchText)}
      />
      <Action
        title="Send Clipboard Image"
        icon={Icon.Image}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        onAction={async () => {
          const imagePath = await readClipboardImage();
          if (imagePath) {
            await handleSendMessage("", [imagePath]);
          } else {
            await showToast({
              style: Toast.Style.Failure,
              title: "No Image in Clipboard",
              message: "Copy an image first",
            });
          }
        }}
      />
      <Action
        title="Copy Last Response"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        onAction={handleCopyLastResponse}
      />
      <Action
        title="Copy Conversation"
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onAction={async () => {
          if (messages.length === 0) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Nothing to Copy",
            });
            return;
          }
          await Clipboard.copy(conversationMarkdown);
          await showToast({
            style: Toast.Style.Success,
            title: "Conversation Copied",
          });
        }}
      />
      <Action
        title="Export as Markdown"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        onAction={async () => {
          if (messages.length === 0) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Nothing to Export",
            });
            return;
          }
          try {
            const markdown = buildExportMarkdown(
              messages,
              modelLabel,
              providerLabel,
            );
            const firstUserMsg = messages.find((m) => m.role === "user");
            const titleSlug = sanitizeFilename(
              firstUserMsg?.content.slice(0, 60) || "conversation",
            );
            const dateStr = new Date().toISOString().slice(0, 10);
            const filename = `${dateStr}-${titleSlug}.md`;

            const exportDir = join(homedir(), "Desktop");
            await mkdir(exportDir, { recursive: true });
            const filePath = join(exportDir, filename);
            await writeFile(filePath, markdown, "utf-8");

            await showToast({
              style: Toast.Style.Success,
              title: "Exported to Desktop",
              message: filename,
              primaryAction: {
                title: "Open File",
                onAction: () => open(filePath),
              },
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            await showToast({
              style: Toast.Style.Failure,
              title: "Export Failed",
              message: msg,
            });
          }
        }}
      />
      <Action
        title="Save Conversation"
        icon={Icon.SaveDocument}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        onAction={handleSaveConversation}
      />
      <Action
        title="New Conversation"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        onAction={handleNewConversation}
      />
      {models.length > 0 && (
        <Action
          title="Change Model"
          icon={Icon.ComputerChip}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          onAction={() =>
            push(
              <ModelSelector
                models={models}
                onSelect={(modelId) => {
                  setCurrentModel(modelId);
                  showToast({
                    style: Toast.Style.Success,
                    title: `Model: ${modelId}`,
                  });
                }}
              />,
            )
          }
        />
      )}
      <Action
        title="Configure Extension"
        icon={Icon.Cog}
        onAction={() => push(<OnboardingForm onComplete={() => {}} />)}
      />
      <Action
        title="Chat Settings"
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={() =>
          push(
            <ChatSettingsForm
              current={{
                temperature: effectiveTemperature,
                maxTokens: effectiveMaxTokens,
                systemPrompt: effectiveSystemPrompt,
              }}
              showModelField={models.length === 0}
              currentModel={currentModel}
              onModelChange={(model) => {
                setCurrentModel(model);
                showToast({
                  style: Toast.Style.Success,
                  title: `Model: ${model}`,
                });
              }}
              onApply={(overrides) => {
                setSessionOverrides((prev) => ({
                  temperature:
                    overrides.temperature !== undefined
                      ? overrides.temperature
                      : prev.temperature,
                  maxTokens:
                    overrides.maxTokens !== undefined
                      ? overrides.maxTokens
                      : prev.maxTokens,
                  systemPrompt:
                    overrides.systemPrompt !== undefined
                      ? overrides.systemPrompt
                      : prev.systemPrompt,
                }));
                showToast({
                  style: Toast.Style.Success,
                  title: "Chat Settings Updated",
                });
              }}
            />,
          )
        }
      />
    </ActionPanel>
  );

  // Connection error state
  if (initDone && initError) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Setup Required"
          description={`${initError}\n\nStart your local AI server and configure the URL in extension preferences.\n\nOllama: ollama serve (port 11434)\nLM Studio: Start server in app (port 1234)\nllama.cpp: llama-server -m model.gguf (port 8080)`}
          actions={
            <ActionPanel>
              <Action
                title="Open Settings"
                icon={Icon.Gear}
                onAction={() => openExtensionPreferences()}
              />
              <Action
                title="Configure Extension"
                icon={Icon.Cog}
                onAction={() => push(<OnboardingForm onComplete={() => {}} />)}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Build the list of visible (non-system) messages
  const visibleMessages = messages.filter((m) => m.role !== "system");

  // Determine the ID of the bottom-most item for auto-scroll
  const bottomItemId = isSearching
    ? "searching"
    : isLoading && currentResponse
      ? "streaming"
      : isLoading && !currentResponse
        ? "thinking"
        : visibleMessages.length > 0
          ? `msg-${visibleMessages.length - 1}`
          : undefined;

  // Only auto-scroll if user hasn't manually scrolled up
  const selectedItemId = userScrolledRef.current ? undefined : bottomItemId;

  return (
    <List
      isLoading={!initDone || isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        // If user selects something other than the bottom item, they scrolled up
        if (id && id !== bottomItemId) {
          userScrolledRef.current = true;
        }
        // If user scrolls back to the bottom item, re-enable auto-scroll
        if (id && id === bottomItemId) {
          userScrolledRef.current = false;
        }
      }}
      searchBarPlaceholder={
        isLoading
          ? "Generating response\u2026"
          : `Message ${modelLabel} \u2014 press Enter to send`
      }
      isShowingDetail
      searchBarAccessory={
        models.length > 0 ? (
          <List.Dropdown
            tooltip="Model"
            value={currentModel}
            onChange={(val) => {
              setCurrentModel(val);
              showToast({ style: Toast.Style.Success, title: `Model: ${val}` });
            }}
          >
            {models.map((m) => (
              <List.Dropdown.Item
                key={m.id}
                value={m.id}
                title={m.id}
                icon={Icon.ComputerChip}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {/* Empty state */}
      {visibleMessages.length === 0 && !isLoading && initDone && (
        <List.EmptyView
          icon={Icon.Message}
          title={`Chat with ${modelLabel}`}
          description={`Provider: ${providerLabel}\nType a message above and press Enter to start chatting.\nSend clipboard image: \u2318\u21E7V`}
          actions={actions}
        />
      )}

      {/* Conversation messages */}
      {visibleMessages.map((msg, index) => {
        const isUser = msg.role === "user";
        const hasImages = isUser && msg.images && msg.images.length > 0;
        return (
          <List.Item
            key={`msg-${index}`}
            id={`msg-${index}`}
            title={isUser ? "You" : "Assistant"}
            subtitle={
              hasImages
                ? `[Image] ${truncate(msg.content, 40)}`
                : truncate(msg.content, 50)
            }
            icon={
              isUser
                ? { source: Icon.Person, tintColor: Color.Blue }
                : { source: Icon.Stars, tintColor: Color.Purple }
            }
            accessories={
              hasImages ? [{ icon: Icon.Image, tooltip: "Has image" }] : []
            }
            detail={<List.Item.Detail markdown={conversationMarkdown} />}
            actions={actions}
          />
        );
      })}

      {/* Searching indicator */}
      {isSearching && (
        <List.Item
          key="searching"
          id="searching"
          title="Searching the web\u2026"
          icon={{ source: Icon.Globe, tintColor: Color.Blue }}
          detail={<List.Item.Detail markdown={conversationMarkdown} />}
          actions={actions}
        />
      )}

      {/* Thinking indicator */}
      {isLoading && !currentResponse && !isSearching && (
        <List.Item
          key="thinking"
          id="thinking"
          title="Assistant"
          subtitle="Thinking..."
          icon={{ source: Icon.Stars, tintColor: Color.Orange }}
          detail={<List.Item.Detail markdown={conversationMarkdown} />}
          actions={actions}
        />
      )}

      {/* Streaming indicator */}
      {isLoading && currentResponse && (
        <List.Item
          key="streaming"
          id="streaming"
          title="Assistant"
          subtitle={truncate(currentResponse, 50)}
          icon={{ source: Icon.Stars, tintColor: Color.Green }}
          detail={<List.Item.Detail markdown={conversationMarkdown} />}
          actions={actions}
        />
      )}
    </List>
  );
}

const WEB_SEARCH_TIP_KEY = "web_search_tip_shown";

function useWebSearchTip() {
  const [checking, setChecking] = useState(true);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    (async () => {
      const seen = await LocalStorage.getItem<string>(WEB_SEARCH_TIP_KEY);
      setShowTip(seen !== "true");
      setChecking(false);
    })();
  }, []);

  const dismiss = useCallback(async () => {
    await LocalStorage.setItem(WEB_SEARCH_TIP_KEY, "true");
    setShowTip(false);
  }, []);

  return { showTip, checking, dismiss };
}

function WebSearchTip({ onDismiss }: { onDismiss: () => void }) {
  const markdown = useMemo(
    () => `# Enable Web Search

Your AI can search the web for up-to-date information!

## How to enable

1. Open **Extension Preferences** (use the action below or press \`Cmd+,\` in Raycast)
2. Check **"Enable web search"**
3. Paste your **Brave Search API Key**

## Get a free API key

Visit [brave.com/search/api](https://brave.com/search/api) to get a free key — **2,000 queries/month** at no cost.

---

*You can always configure this later in extension preferences.*`,
    [],
  );

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Got It" icon={Icon.Checkmark} onAction={onDismiss} />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={() => {
              openExtensionPreferences();
              onDismiss();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Chat(
  props: LaunchProps<{ launchContext?: ChatLaunchContext }>,
) {
  const { needsOnboarding, isChecking, markDone } = useOnboarding();
  const {
    showTip,
    checking: tipChecking,
    dismiss: dismissTip,
  } = useWebSearchTip();

  if (isChecking || tipChecking) {
    return <Detail isLoading markdown="" />;
  }

  if (needsOnboarding) {
    return <OnboardingForm onComplete={markDone} />;
  }

  if (showTip) {
    return <WebSearchTip onDismiss={dismissTip} />;
  }

  return <ChatView {...props} />;
}
