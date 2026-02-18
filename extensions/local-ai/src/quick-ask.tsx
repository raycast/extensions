import {
  Detail,
  ActionPanel,
  Action,
  Form,
  Icon,
  Toast,
  showToast,
  Clipboard,
  launchCommand,
  LaunchType,
  LaunchProps,
  LocalStorage,
  useNavigation,
  openExtensionPreferences,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { getProviderConfig, fetchModels, sendChatStream } from "./lib/api";
import { parseSSEStream } from "./lib/streaming";
import { webSearch, formatSearchContext, shouldSearch } from "./lib/web-search";
import type { ChatMessage, ProviderConfig } from "./lib/types";
import { PROMPT_PRESETS } from "./lib/prompts";
import { useOnboarding } from "./lib/use-onboarding";
import { OnboardingForm } from "./onboarding-form";

/** Detail view that streams the AI response for a given question. */
function ResponseView({
  question,
  config,
  model,
  systemPromptOverride,
}: {
  question: string;
  config: ProviderConfig;
  model: string;
  systemPromptOverride?: string;
}) {
  const { pop, push } = useNavigation();
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    (async () => {
      const messages: ChatMessage[] = [];
      const effectivePrompt = systemPromptOverride ?? config.systemPrompt;
      if (effectivePrompt) {
        messages.push({ role: "system", content: effectivePrompt });
      }

      // Web search: inject context if enabled and query triggers search
      const prefs = getPreferenceValues<Preferences>();
      if (prefs.webSearchEnabled && shouldSearch(question)) {
        try {
          const results = await webSearch(question);
          if (results.length > 0) {
            const context = formatSearchContext(results);
            messages.push({
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
        }
      }

      messages.push({ role: "user", content: question });

      try {
        const stream = await sendChatStream(config, {
          model,
          messages,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        });

        let fullResponse = "";
        for await (const token of parseSSEStream(stream)) {
          fullResponse += token;
          setResponse(fullResponse);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        await showToast({
          style: Toast.Style.Failure,
          title: "Connection Error",
          message: errorMessage,
          primaryAction: {
            title: "Open Settings",
            onAction: () => openExtensionPreferences(),
          },
        });
        setResponse(`**Error:** ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [question, config, model]);

  const markdown =
    isLoading && !response
      ? `### ${question}\n\n*Thinking...*`
      : `### ${question}\n\n---\n\n${response}${isLoading ? "\n\n*Generating...*" : ""}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Response"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={async () => {
              if (response) {
                await Clipboard.copy(response);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied to Clipboard",
                });
              }
            }}
          />
          <Action
            title="Open in Chat"
            icon={Icon.Message}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "chat",
                  type: LaunchType.UserInitiated,
                  context: {
                    initialQuestion: question,
                    initialResponse: response,
                    model,
                  },
                });
              } catch {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not open Chat",
                });
              }
            }}
          />
          <Action
            title="Ask Another"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={pop}
          />
          <Action
            title="Configure Extension"
            icon={Icon.Cog}
            onAction={() => push(<OnboardingForm onComplete={() => {}} />)}
          />
        </ActionPanel>
      }
    />
  );
}

/** Form for entering a question when no argument was provided. */
function AskForm({ config, model }: { config: ProviderConfig; model: string }) {
  const { push } = useNavigation();
  const [selectedPresetId, setSelectedPresetId] = useState("default");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            icon={Icon.ArrowRight}
            onSubmit={(values: { question: string }) => {
              const text = values.question.trim();
              if (text) {
                const preset = PROMPT_PRESETS.find(
                  (p) => p.id === selectedPresetId,
                );
                const presetPrompt = preset?.prompt || undefined;
                push(
                  <ResponseView
                    question={text}
                    config={config}
                    model={model}
                    systemPromptOverride={presetPrompt}
                  />,
                );
              }
            }}
          />
          <Action
            title="Configure Extension"
            icon={Icon.Cog}
            onAction={() => push(<OnboardingForm onComplete={() => {}} />)}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="preset"
        title="System Prompt"
        info="Optionally select a system prompt preset"
        value={selectedPresetId}
        onChange={setSelectedPresetId}
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
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="Ask anything..."
        autoFocus
      />
    </Form>
  );
}

function QuickAskView(props: LaunchProps<{ arguments: Arguments.QuickAsk }>) {
  const { push } = useNavigation();
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [model, setModel] = useState("");
  const [ready, setReady] = useState(false);
  const hasNavigated = useRef(false);

  const query = props.arguments.query?.trim() || "";

  useEffect(() => {
    (async () => {
      const providerConfig = await getProviderConfig();
      setConfig(providerConfig);

      let selectedModel = providerConfig.defaultModel;

      try {
        const storedDefault =
          await LocalStorage.getItem<string>("default_model");
        if (storedDefault) {
          selectedModel = storedDefault;
        } else if (!selectedModel) {
          const modelList = await fetchModels(providerConfig);
          selectedModel = modelList[0]?.id || "";
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Cannot connect to server";
        await showToast({
          style: Toast.Style.Failure,
          title: "Connection Error",
          message: errorMessage,
          primaryAction: {
            title: "Open Settings",
            onAction: () => openExtensionPreferences(),
          },
        });
      }

      setModel(selectedModel);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready && config && query && !hasNavigated.current) {
      hasNavigated.current = true;
      push(<ResponseView question={query} config={config} model={model} />);
    }
  }, [ready, config, query, model, push]);

  if (!ready || !config) {
    return <Detail isLoading markdown="" />;
  }

  if (query) {
    return <Detail isLoading markdown="" />;
  }

  return <AskForm config={config} model={model} />;
}

export default function QuickAsk(
  props: LaunchProps<{ arguments: Arguments.QuickAsk }>,
) {
  const { needsOnboarding, isChecking, markDone } = useOnboarding();

  if (isChecking) {
    return <Detail isLoading markdown="" />;
  }

  if (needsOnboarding) {
    return <OnboardingForm onComplete={markDone} />;
  }

  return <QuickAskView {...props} />;
}
