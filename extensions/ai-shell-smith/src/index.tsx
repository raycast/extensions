import { useState, useEffect, useMemo, useRef } from "react";
import {
  Action,
  ActionPanel,
  AI,
  Alert,
  closeMainWindow,
  Color,
  confirmAlert,
  environment,
  showToast,
  Toast,
  List,
  Icon,
  Keyboard,
  openCommandPreferences,
  getPreferenceValues,
  Clipboard,
  LocalStorage,
} from "@raycast/api";
import { showFailureToast, useLocalStorage } from "@raycast/utils";
import { runCommandInDefaultTerminal, executeAndCaptureOutput } from "./utils";
import {
  convertPrompt,
  refinePrompt,
  type Candidate,
  type Platform,
} from "./engine";
import { assessRisk, type Risk } from "./checks";
import RefineForm from "./refine-form";
import {
  MODELS_BY_PROVIDER,
  OPENAI_MODELS,
  type Provider,
  type ModelOption,
} from "./config";
import type { CommandHistoryItem } from "./types";

const PROVIDERS: ReadonlyArray<{ title: string; value: Provider }> = [
  { title: "OpenAI", value: "openai" },
  { title: "Perplexity", value: "perplexity" },
  { title: "Ollama", value: "ollama" },
  { title: "Raycast AI", value: "raycast" },
];

const SEARCH_MODEL = "gpt-5-search-api";
const HISTORY_KEY = "history";
const PLATFORM_LABELS: Record<Platform, string> = {
  macos: "macOS",
  linux: "Linux",
  windows: "Windows",
  any: "Any OS",
};
const RISK_TAGS: Record<
  Exclude<Risk, "safe">,
  { label: string; color: Color }
> = {
  caution: { label: "Caution", color: Color.Yellow },
  destructive: { label: "Destructive", color: Color.Red },
};
const MIN_PROMPT_CHARS = 3;
const DEBOUNCE_MS = 2500;

const modelsFor = (provider: Provider): ReadonlyArray<ModelOption> =>
  MODELS_BY_PROVIDER[provider];

const askRaycastAI = (prompt: string) => AI.ask(prompt, { creativity: "none" });

const altLine = (alt: Candidate) =>
  `- \`${alt.command}\`${alt.label ? ` — ${alt.label}` : ""}${
    alt.platform === "any" ? "" : ` (${PLATFORM_LABELS[alt.platform]})`
  }`;

const detailMarkdown = (item: CommandHistoryItem) =>
  [
    "```sh\n" + item.command + "\n```",
    item.explanation,
    item.alternatives?.length &&
      `**Alternatives** (⌘1–⌘3 to copy)\n\n${item.alternatives.map(altLine).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

// Live check, so entries saved before risk badges existed are covered too.
const confirmIfDestructive = async (command: string) => {
  const { risk, reason } = assessRisk(command);
  return (
    risk !== "destructive" ||
    confirmAlert({
      title: "Run a destructive command?",
      message: `${reason}:\n${command}`,
      primaryAction: {
        title: "Run Anyway",
        style: Alert.ActionStyle.Destructive,
      },
    })
  );
};

export default function Command(props: { arguments: Arguments.Index }) {
  const { prompt: defaultPrompt } = props.arguments;
  const {
    provider: defaultProvider = "openai",
    openaiModel = OPENAI_MODELS[0].value,
    ollamaModel = MODELS_BY_PROVIDER.ollama[0].value,
    webSearch: defaultWebSearch = false,
    apiKey,
    perplexityApiKey,
    openaiUrl,
    openaiModelCustom,
    ollamaUrl = "http://localhost:11434",
    ollamaApiKey,
    context7ApiKey,
    shellHistory = false,
    terminal = "auto",
  } = getPreferenceValues<Preferences>();

  // Preferences pick the model for their provider; others start at their first model.
  const defaultModelFor = (p: Provider): string =>
    p === "openai"
      ? openaiModel
      : p === "ollama"
        ? ollamaModel
        : modelsFor(p)[0].value;

  const [provider, setProvider] = useState<Provider>(defaultProvider);
  const [model, setModel] = useState<string>(() =>
    defaultModelFor(defaultProvider),
  );
  const [webSearch, setWebSearch] = useState<boolean>(
    defaultWebSearch && defaultProvider === "openai",
  );
  const { value: history, setValue: setHistory } = useLocalStorage<
    CommandHistoryItem[]
  >(HISTORY_KEY, []);
  const [prompt, setPrompt] = useState<string>(defaultPrompt ?? "");
  const [loading, setLoading] = useState<boolean>(false);
  const [showDetail, setShowDetail] = useState(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  // Prompt most recently sent for conversion — stops the debounce from
  // re-converting the same text (e.g. the launch argument) a second time.
  const lastConverted = useRef<string | null>(null);
  // Id of the newest request; older ones finishing late must not touch the UI.
  const requestId = useRef(0);

  const models = modelsFor(provider);

  const selectProvider = (p: Provider, m = defaultModelFor(p)) => {
    setProvider(p);
    setModel(m);
    if (p !== "openai") setWebSearch(false);
  };

  // Each change reads the stored list (render state may not have loaded yet)
  // and waits for the previous write, so concurrent conversions don't drop
  // each other's entries.
  const historyWrites = useRef<Promise<unknown>>(Promise.resolve());
  const updateHistory = (
    change: (items: CommandHistoryItem[]) => CommandHistoryItem[],
  ) =>
    (historyWrites.current = historyWrites.current
      .then(async () => {
        const stored = await LocalStorage.getItem<string>(HISTORY_KEY);
        await setHistory(change(stored ? JSON.parse(stored) : []));
      })
      .catch((error) =>
        showFailureToast(error, { title: "Couldn't save history" }),
      ));

  // `label` is what the history shows; refinements send a longer prompt.
  const executeConversion = async (rawPrompt: string, label?: string) => {
    // ↵ while the typing timer is pending must not convert twice.
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    lastConverted.current = rawPrompt;
    const trimmed = rawPrompt.trim();
    if (trimmed.length < 2) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a valid prompt",
      });
      return;
    }
    if (provider === "raycast" && !environment.canAccess(AI)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Raycast AI unavailable",
        message: "Requires Raycast Pro — pick another provider with ⌘L",
      });
      return;
    }

    const id = ++requestId.current;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Converting prompt",
    });
    setLoading(true);

    const result = await convertPrompt({
      prompt: trimmed,
      model,
      provider,
      webSearch,
      shellHistory,
      extensionHost: true,
      ask: askRaycastAI,
      apiKeys: {
        openai: apiKey,
        perplexity: perplexityApiKey,
        ollama: ollamaApiKey,
        context7: context7ApiKey,
      },
      urls: { openaiUrl, ollamaUrl },
      customModels: { openai: openaiModelCustom },
    });

    if (result.success && result.candidates?.length) {
      const [best, ...alternatives] = result.candidates;
      await updateHistory((items) => [
        ...items,
        { ...best, prompt: label ?? trimmed, alternatives },
      ]);
      // Clear the box only if it still holds this prompt — not newer typing.
      setPrompt((current) => (current === rawPrompt ? "" : current));
    }

    toast.style = result.success ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = result.title;
    if (result.message) toast.message = result.message;

    if (id === requestId.current) setLoading(false);
  };

  const reverseHistory = useMemo(
    () => [...(history ?? [])].reverse(),
    [history],
  );

  useEffect(() => {
    if (defaultPrompt) executeConversion(defaultPrompt);
  }, [defaultPrompt]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    // Allow search with minimal input when web search is enabled
    const minChars = webSearch ? 1 : MIN_PROMPT_CHARS;
    if (prompt.length >= minChars && prompt !== lastConverted.current) {
      debounceTimer.current = setTimeout(
        () => executeConversion(prompt),
        DEBOUNCE_MS,
      );
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [prompt, webSearch, provider, model]);

  const convertAction = (
    <Action
      title="Convert Prompt"
      icon={Icon.Wand}
      onAction={() => executeConversion(prompt)}
    />
  );

  const preferencesAction = (
    <Action
      title="Change Provider or API Key"
      icon={Icon.Key}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      onAction={openCommandPreferences}
    />
  );

  const renderSearchBarAccessory = () => {
    if (prompt) return null;
    return (
      <List.Dropdown
        tooltip="Provider / Model"
        value={webSearch ? `openai:${SEARCH_MODEL}` : `${provider}:${model}`}
        onChange={(val) => {
          const colonIdx = val.indexOf(":");
          const prov = val.slice(0, colonIdx) as Provider;
          const mod = val.slice(colonIdx + 1);
          if (mod === SEARCH_MODEL) {
            selectProvider("openai");
            setWebSearch(true);
          } else {
            selectProvider(prov, mod);
            setWebSearch(false);
          }
        }}
      >
        {PROVIDERS.flatMap((p) =>
          modelsFor(p.value).map((m) => (
            <List.Dropdown.Item
              key={`${p.value}:${m.value}`}
              title={`${p.title} - ${m.title}`}
              value={`${p.value}:${m.value}`}
            />
          )),
        )}
        <List.Dropdown.Item
          title="OpenAI - GPT-5 Search"
          value={`openai:${SEARCH_MODEL}`}
        />
      </List.Dropdown>
    );
  };

  return (
    <List
      filtering={false}
      onSearchTextChange={setPrompt}
      searchBarPlaceholder="Describe a command…"
      searchText={prompt}
      isLoading={loading}
      isShowingDetail={showDetail && reverseHistory.length > 0}
      searchBarAccessory={renderSearchBarAccessory()}
      actions={
        <ActionPanel>
          {convertAction}
          {preferencesAction}
        </ActionPanel>
      }
    >
      {prompt.trim().length > 0 && !loading && (
        <List.Item
          title={`Convert “${prompt.trim()}”`}
          icon={Icon.Wand}
          detail={<List.Item.Detail markdown="Press ↵ to convert now." />}
          actions={
            <ActionPanel>
              {convertAction}
              {preferencesAction}
            </ActionPanel>
          }
        />
      )}

      {!reverseHistory.length && (
        <List.Section title="Settings">
          <List.Item
            title={`Provider: ${
              PROVIDERS.find((p) => p.value === provider)?.title ?? provider
            }`}
            icon={Icon.Cloud}
            actions={
              <ActionPanel>
                {PROVIDERS.filter((p) => p.value !== provider).map((p) => (
                  <Action
                    key={p.value}
                    title={`Switch to ${p.title}`}
                    onAction={() => selectProvider(p.value)}
                  />
                ))}
              </ActionPanel>
            }
          />
          <List.Item
            title={`Model: ${
              webSearch
                ? "GPT-5 Search"
                : (models.find((m) => m.value === model)?.title ?? model)
            }`}
            subtitle={webSearch ? "Locked while web search is enabled" : ""}
            icon={Icon.Gear}
            actions={
              webSearch ? undefined : (
                <ActionPanel>
                  {models
                    .filter((m) => m.value !== model)
                    .map((m) => (
                      <Action
                        key={m.value}
                        title={`Switch to ${m.title}`}
                        onAction={() => setModel(m.value)}
                      />
                    ))}
                </ActionPanel>
              )
            }
          />
          {provider === "openai" && (
            <List.Item
              title={`Web Search: ${webSearch ? "Enabled" : "Disabled"}`}
              icon={webSearch ? Icon.CheckCircle : Icon.Circle}
              actions={
                <ActionPanel>
                  <Action
                    title={
                      webSearch ? "Disable Web Search" : "Enable Web Search"
                    }
                    onAction={() => setWebSearch(!webSearch)}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}

      {!loading && !reverseHistory.length && !prompt && (
        <List.Item
          title="No history yet"
          subtitle="Describe a command and press ↵"
          icon={Icon.Clock}
        />
      )}
      <List.Section title="Command History">
        {loading && (
          <List.Item
            title="Hang on, converting your prompt…"
            icon={Icon.Terminal}
            subtitle={prompt}
            detail={<List.Item.Detail markdown={`Converting “${prompt}”…`} />}
          />
        )}
        {reverseHistory.map((item, i) => {
          const { risk, reason } = assessRisk(item.command);
          return (
            <List.Item
              title={item.command}
              icon={Icon.Terminal}
              subtitle={item.prompt}
              key={`${i}-${item.command}`}
              detail={
                <List.Item.Detail
                  markdown={detailMarkdown(item)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Request"
                        text={item.prompt}
                      />
                      <List.Item.Detail.Metadata.TagList title="Runs on">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={PLATFORM_LABELS[item.platform ?? "any"]}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      {risk === "safe" ? null : (
                        <List.Item.Detail.Metadata.TagList title="Risk">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={`${RISK_TAGS[risk].label}: ${reason}`}
                            color={RISK_TAGS[risk].color}
                          />
                        </List.Item.Detail.Metadata.TagList>
                      )}
                      {item.missing?.length ? (
                        <List.Item.Detail.Metadata.TagList title="Not installed">
                          {item.missing.map((program) => (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={program}
                              text={program}
                              color={Color.Orange}
                            />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              // The detail pane hides accessories; only build them without it.
              accessories={
                showDetail
                  ? undefined
                  : [
                      ...(risk === "safe"
                        ? []
                        : [
                            {
                              tag: {
                                value: RISK_TAGS[risk].label,
                                color: RISK_TAGS[risk].color,
                              },
                              tooltip: reason,
                            },
                          ]),
                      ...(item.missing?.length
                        ? [
                            {
                              tag: {
                                value: `needs ${item.missing.join(", ")}`,
                                color: Color.Orange,
                              },
                              tooltip: "Not installed on this Mac",
                            },
                          ]
                        : []),
                      ...(item.platform && item.platform !== "any"
                        ? [{ tag: PLATFORM_LABELS[item.platform] }]
                        : []),
                      ...(item.alternatives?.length
                        ? [
                            {
                              icon: Icon.List,
                              text: `+${item.alternatives.length}`,
                              tooltip:
                                "Alternatives in Actions (⌘K), copy with ⌘1–⌘3",
                            },
                          ]
                        : []),
                    ]
              }
              actions={
                <ActionPanel title="AI Shell Smith Actions">
                  <Action.CopyToClipboard
                    title="Copy Command to Clipboard"
                    content={item.command}
                  />
                  <Action
                    title="Execute in Terminal"
                    icon={Icon.Terminal}
                    onAction={async () => {
                      if (!(await confirmIfDestructive(item.command))) return;
                      try {
                        await closeMainWindow();
                        await runCommandInDefaultTerminal(
                          item.command,
                          terminal,
                        );
                      } catch (error) {
                        await showFailureToast(error, {
                          title: "Couldn't open the terminal",
                        });
                      }
                    }}
                  />
                  <Action
                    title="Execute & Copy Output"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    onAction={async () => {
                      if (!(await confirmIfDestructive(item.command))) return;
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: "Executing command…",
                      });
                      try {
                        const output = await executeAndCaptureOutput(
                          item.command,
                        );
                        await Clipboard.copy(output);
                        toast.style = Toast.Style.Success;
                        toast.title = "Output copied";
                        toast.message = `${output.split("\n").length} line(s)`;
                      } catch (error) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Execution failed";
                        toast.message =
                          error instanceof Error
                            ? error.message
                            : String(error);
                      }
                    }}
                  />
                  <Action.Push
                    title="Refine Command"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={
                      <RefineForm
                        command={item.command}
                        onRefine={(change) =>
                          executeConversion(
                            refinePrompt(item.prompt, item.command, change),
                            `${item.prompt} → ${change}`,
                          )
                        }
                      />
                    }
                  />
                  <Action
                    title={showDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => setShowDetail(!showDetail)}
                  />
                  <Action
                    title="Delete from History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                    onAction={() =>
                      updateHistory((items) => {
                        const at = items.findIndex(
                          (h) => JSON.stringify(h) === JSON.stringify(item),
                        );
                        return at < 0 ? items : items.toSpliced(at, 1);
                      })
                    }
                  />
                  {item.alternatives?.length ? (
                    <ActionPanel.Section title="Alternatives">
                      {item.alternatives.map((alt, n) => (
                        <Action.CopyToClipboard
                          key={alt.command}
                          title={`Copy ${alt.label ?? alt.command}${
                            alt.platform === "any"
                              ? ""
                              : ` (${PLATFORM_LABELS[alt.platform]})`
                          }`}
                          content={alt.command}
                          shortcut={
                            n < 3
                              ? {
                                  modifiers: ["cmd"],
                                  key: String(n + 1) as "1" | "2" | "3",
                                }
                              : undefined
                          }
                        />
                      ))}
                    </ActionPanel.Section>
                  ) : null}
                  {preferencesAction}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
