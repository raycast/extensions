import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchProps,
  LaunchType,
  List,
  Toast,
  getSelectedText,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { LANGUAGE_CHOICES, getLanguageTitle, resolveTargetLanguage } from "./languages";
import {
  PROVIDER_TITLES,
  getMaxOutputTokens,
  getOrderedProviderIds,
  getProviderConfig,
  getTimeoutMs,
  readPreferences,
} from "./preferences";
import { MissingAPIKeyError, translateWithProvider } from "./providers";
import { TranslationRequest, TranslationResult } from "./types";

interface TranslateArguments {
  text?: string;
}

const providerIcons = {
  deepseek: Icon.Waveform,
  mimo: Icon.AppWindowGrid2x2,
  minimax: Icon.Bolt,
  gemini: Icon.Stars,
  kimi: Icon.Moon,
  openai: Icon.Message,
} as const;

export default function Command(props: LaunchProps<{ arguments: TranslateArguments }>) {
  const preferences = useMemo(() => readPreferences(), []);
  const [inputText, setInputText] = useState<string>();
  const [targetLanguage, setTargetLanguage] = useState(preferences.targetLanguage);
  const [results, setResults] = useState<TranslationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [manualRunId, setManualRunId] = useState(0);
  const requestSequence = useRef(0);

  useEffect(() => {
    let isMounted = true;

    async function setup() {
      const launchText = normalizeInputText(props.arguments?.text ?? props.fallbackText ?? "");
      if (launchText) {
        if (isMounted) setInputText(launchText);
        return;
      }

      try {
        const selectedText = normalizeInputText(await getSelectedText());
        if (isMounted) setInputText(selectedText);
      } catch {
        if (isMounted) setInputText("");
      }
    }

    void setup();
    return () => {
      isMounted = false;
    };
  }, [props.arguments?.text, props.fallbackText]);

  useEffect(() => {
    if (inputText === undefined) {
      return;
    }

    const sequence = ++requestSequence.current;
    const text = normalizeInputText(inputText);

    if (!text) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      void runTranslations(text, sequence);
    }, 350);

    return () => clearTimeout(timer);
  }, [inputText, targetLanguage, manualRunId]);

  async function runTranslations(text: string, sequence: number) {
    const providerIds = getOrderedProviderIds(preferences);
    const pendingResults = providerIds.map<TranslationResult>((providerId) => ({
      providerId,
      providerTitle: PROVIDER_TITLES[providerId],
      status: "pending",
    }));
    setResults(pendingResults);

    const resolvedTargetLanguage = resolveTargetLanguage(targetLanguage, text);
    const request: TranslationRequest = {
      text,
      targetLanguage: resolvedTargetLanguage,
      targetLanguageTitle: getLanguageTitle(resolvedTargetLanguage),
      style: preferences.translationStyle,
      promptProfile: preferences.promptProfile ?? "screenshot",
      customPromptInstructions: preferences.customPromptInstructions,
      timeoutMs: getTimeoutMs(preferences),
      maxOutputTokens: getMaxOutputTokens(preferences),
    };

    await Promise.all(
      providerIds.map(async (providerId) => {
        const config = getProviderConfig(providerId, preferences);
        const startedAt = Date.now();

        try {
          const translation = await translateWithProvider(config, request);
          updateResult(sequence, {
            providerId,
            providerTitle: config.title,
            status: "success",
            translation,
            durationMs: Date.now() - startedAt,
          });
        } catch (error) {
          updateResult(sequence, {
            providerId,
            providerTitle: config.title,
            status: error instanceof MissingAPIKeyError ? "missing-key" : "error",
            error: error instanceof Error ? error.message : String(error),
            durationMs: Date.now() - startedAt,
          });
        }
      }),
    );

    if (sequence === requestSequence.current) {
      setIsLoading(false);
    }
  }

  function updateResult(sequence: number, result: TranslationResult) {
    if (sequence !== requestSequence.current) {
      return;
    }

    setResults((previousResults) =>
      previousResults.map((previousResult) =>
        previousResult.providerId === result.providerId ? result : previousResult,
      ),
    );
  }

  function retry() {
    setManualRunId((value) => value + 1);
  }

  const resolvedTargetLanguage = resolveTargetLanguage(targetLanguage, inputText ?? "");
  const targetLanguageTitle = getLanguageTitle(resolvedTargetLanguage);

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      isShowingDetail={results.length > 0}
      navigationTitle="AI Translate"
      onSearchTextChange={setInputText}
      searchBarAccessory={
        <List.Dropdown tooltip="Target Language" value={targetLanguage} onChange={setTargetLanguage}>
          {LANGUAGE_CHOICES.map((language) => (
            <List.Dropdown.Item key={language.value} title={language.title} value={language.value} />
          ))}
        </List.Dropdown>
      }
      searchBarPlaceholder="Select text, paste OCR text, or type to translate..."
      searchText={inputText ?? ""}
    >
      {results.map((result) => (
        <List.Item
          key={result.providerId}
          id={result.providerId}
          icon={{ source: providerIcons[result.providerId], tintColor: iconColor(result.status) }}
          title={result.providerTitle}
          subtitle={subtitle(result)}
          accessories={accessories(result, targetLanguageTitle)}
          detail={<List.Item.Detail markdown={detailMarkdown(result, inputText ?? "")} />}
          actions={<ResultActions result={result} sourceText={inputText ?? ""} onRetry={retry} />}
        />
      ))}
      <List.EmptyView
        icon={Icon.Text}
        title={inputText === undefined ? "Reading selected text" : "Select or type text to translate"}
        description="Use Screenshot Translate for OCR, or type directly in the search bar."
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Camera}
              title="Screenshot Translate"
              onAction={() => launchCommand({ name: "screenshot-translate", type: LaunchType.UserInitiated })}
            />
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function ResultActions({
  result,
  sourceText,
  onRetry,
}: {
  result: TranslationResult;
  sourceText: string;
  onRetry: () => void;
}) {
  const canUseTranslation = result.status === "success" && Boolean(result.translation);

  return (
    <ActionPanel>
      {canUseTranslation ? (
        <ActionPanel.Section>
          <Action.CopyToClipboard
            content={result.translation ?? ""}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            title="Copy Translation"
          />
          <Action.Paste
            content={result.translation ?? ""}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            title="Paste Translation"
          />
        </ActionPanel.Section>
      ) : null}
      <ActionPanel.Section>
        <Action
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          title="Retry Translation"
          onAction={onRetry}
        />
        <Action
          icon={Icon.Camera}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          title="Screenshot Translate"
          onAction={() => launchCommand({ name: "screenshot-translate", type: LaunchType.UserInitiated })}
        />
        <Action.CopyToClipboard content={sourceText} title="Copy Source Text" />
        <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        {result.status === "error" || result.status === "missing-key" ? (
          <Action
            icon={Icon.ExclamationMark}
            title="Show Error Toast"
            onAction={() =>
              showToast({
                style: Toast.Style.Failure,
                title: result.providerTitle,
                message: result.error,
              })
            }
          />
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function normalizeInputText(text: string | undefined): string {
  return (text ?? "").replace(/\r\n/g, "\n").trim().slice(0, 12000);
}

function subtitle(result: TranslationResult): string {
  switch (result.status) {
    case "pending":
      return "Translating...";
    case "missing-key":
      return "API key required";
    case "error":
      return result.error ?? "Translation failed";
    case "success":
      return singleLinePreview(result.translation ?? "");
  }
}

function accessories(result: TranslationResult, targetLanguageTitle: string): List.Item.Accessory[] {
  const items: List.Item.Accessory[] = [{ text: targetLanguageTitle }];
  if (result.durationMs !== undefined && result.status !== "pending") {
    items.push({ text: `${(result.durationMs / 1000).toFixed(1)}s` });
  }
  return items;
}

function iconColor(status: TranslationResult["status"]): Color {
  switch (status) {
    case "success":
      return Color.Green;
    case "error":
    case "missing-key":
      return Color.Red;
    case "pending":
      return Color.Blue;
  }
}

function detailMarkdown(result: TranslationResult, sourceText: string): string {
  if (result.status === "pending") {
    return `# ${result.providerTitle}\n\nTranslating...`;
  }

  if (result.status === "missing-key") {
    return [
      `# ${result.providerTitle}`,
      "",
      "API key is not configured. Open extension preferences and add the key for this provider.",
      "",
      "## Source",
      fenced(sourceText),
    ].join("\n");
  }

  if (result.status === "error") {
    return [
      `# ${result.providerTitle}`,
      "",
      result.error ?? "Translation failed.",
      "",
      "## Source",
      fenced(sourceText),
    ].join("\n");
  }

  return [
    `# ${result.providerTitle}`,
    "",
    "## Translation",
    "",
    result.translation ?? "",
    "",
    "---",
    "",
    "## Source",
    fenced(sourceText),
  ].join("\n");
}

function fenced(text: string): string {
  return `\`\`\`text\n${text.replace(/```/g, "'''")}\n\`\`\``;
}

function singleLinePreview(text: string): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  return singleLine.length > 96 ? `${singleLine.slice(0, 96)}...` : singleLine;
}
