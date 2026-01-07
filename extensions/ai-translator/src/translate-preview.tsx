import React, { useState, useEffect, useRef } from "react";
import {
  List,
  ActionPanel,
  Action,
  Clipboard,
  showToast,
  Toast,
  showHUD,
  popToRoot,
  Icon,
  LaunchProps,
  Color,
} from "@raycast/api";
import {
  getTranslatorConfig,
  smartTranslate,
  LANGUAGES,
  TARGET_LANGUAGE_OPTIONS,
} from "./translator";
import { saveTranslation, getHistory, TranslationHistoryItem } from "./history";

interface TranslatePreviewArguments {
  text?: string;
}

interface LaunchContext {
  text?: string;
}

export default function Command(
  props: LaunchProps<{
    arguments: TranslatePreviewArguments;
    launchContext: LaunchContext;
  }>,
) {
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTargetLanguage, setSelectedTargetLanguage] = useState<string>(
    LANGUAGES.AUTO,
  );
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const items = await getHistory();
      setHistory(items);
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }

  // Auto-load clipboard or context and translate on mount
  useEffect(() => {
    async function loadAndTranslate() {
      try {
        // Priority 1: Launch Context (from Translate Selection command)
        if (props.launchContext?.text) {
          setInputText(props.launchContext.text);
          await handleTranslate(props.launchContext.text);
          return;
        }

        // Priority 2: Clipboard
        const clipboardText = await Clipboard.readText();
        if (clipboardText && clipboardText.trim()) {
          setInputText(clipboardText.trim());
          await handleTranslate(clipboardText.trim());
        }
      } catch (error) {
        console.error("Failed to read clipboard:", error);
      }
    }
    loadAndTranslate();
  }, []);

  async function handleTranslate(text?: string) {
    const textToTranslate = text || inputText;
    if (!textToTranslate.trim()) {
      return;
    }

    const config = getTranslatorConfig();

    if (!config.apiKey || !config.apiURL) {
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: "Please configure API Key and URL in preferences.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await smartTranslate(textToTranslate.trim(), config, {
        sourceLanguage: LANGUAGES.AUTO,
        targetLanguage: selectedTargetLanguage,
      });

      setDetectedLanguage(result.detectedLanguage);
      setTargetLanguage(result.targetLanguage);
      setTranslatedText(result.translatedText);

      // Save to history
      await saveTranslation(
        textToTranslate.trim(),
        result.translatedText,
        result.detectedLanguage,
        result.targetLanguage,
      );

      // Reload history
      await loadHistory();
    } catch (error) {
      console.error("Translation error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Translation Failed",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePaste() {
    if (!translatedText) {
      showToast({
        style: Toast.Style.Failure,
        title: "Nothing to Paste",
        message: "Please wait for translation to complete.",
      });
      return;
    }

    await Clipboard.paste(translatedText);
    await showHUD(`✓ Pasted: ${detectedLanguage} → ${targetLanguage}`);
    await popToRoot();
  }

  async function handleCopy() {
    if (!translatedText) {
      showToast({
        style: Toast.Style.Failure,
        title: "Nothing to Copy",
      });
      return;
    }

    await Clipboard.copy(translatedText);
    await showHUD("✓ Copied to clipboard");
  }

  async function handleHistoryPaste(item: TranslationHistoryItem) {
    await Clipboard.paste(item.translatedText);
    await showHUD("✓ Pasted from history");
    await popToRoot();
  }

  async function handleHistoryCopy(item: TranslationHistoryItem) {
    await Clipboard.copy(item.translatedText);
    await showHUD("✓ Copied from history");
  }

  function handleSearchTextChange(text: string) {
    setInputText(text);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Clear translation result when text is cleared
    if (!text.trim()) {
      setTranslatedText("");
      setDetectedLanguage("");
      setTargetLanguage("");
      return;
    }

    // Debounce translation - 1.5 seconds to allow typing
    debounceTimer.current = setTimeout(() => handleTranslate(text), 1500);
  }

  // Format markdown for detail view
  const detailMarkdown = translatedText
    ? `## Translation Result

**${detectedLanguage}** → **${targetLanguage}**

---

### Original
${inputText}

---

### Translation
${translatedText}`
    : inputText
      ? `## Translating...

**Original text:**
${inputText}`
      : `## Ready

Type text to translate or press Enter on a history item to use it.`;

  // Format time for history
  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
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

  // Show history when no input text
  const showHistory = !inputText.trim() && !translatedText;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter text to translate..."
      onSearchTextChange={handleSearchTextChange}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Target Language"
          value={selectedTargetLanguage}
          onChange={setSelectedTargetLanguage}
        >
          <List.Dropdown.Section title="Target Language">
            {TARGET_LANGUAGE_OPTIONS.map((option) => (
              <List.Dropdown.Item
                key={option.value}
                value={option.value}
                title={option.title}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      isShowingDetail={!showHistory || history.length === 0}
    >
      {translatedText ? (
        <List.Item
          title={
            translatedText.length > 60
              ? translatedText.substring(0, 60) + "..."
              : translatedText
          }
          subtitle={`${detectedLanguage} → ${targetLanguage}`}
          icon={Icon.Globe}
          detail={<List.Item.Detail markdown={detailMarkdown} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Actions">
                <Action
                  title="Paste to Active App"
                  icon={Icon.Clipboard}
                  onAction={handlePaste}
                />
                <Action
                  title="Copy Translation"
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={handleCopy}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Re-translate">
                <Action
                  title="Translate Again"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => handleTranslate()}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : inputText ? (
        <List.Item
          title="Translating..."
          subtitle={
            inputText.length > 40
              ? inputText.substring(0, 40) + "..."
              : inputText
          }
          icon={Icon.Clock}
          detail={<List.Item.Detail markdown={detailMarkdown} />}
          actions={
            <ActionPanel>
              <Action
                title="Translate Now"
                icon={Icon.Globe}
                onAction={() => handleTranslate()}
              />
            </ActionPanel>
          }
        />
      ) : history.length > 0 ? (
        <List.Section title="Recent Translations">
          {history.slice(0, 10).map((item) => (
            <List.Item
              key={item.id}
              title={
                item.translatedText.length > 50
                  ? item.translatedText.substring(0, 50) + "..."
                  : item.translatedText
              }
              subtitle={
                item.originalText.length > 30
                  ? item.originalText.substring(0, 30) + "..."
                  : item.originalText
              }
              accessories={[{ text: formatTime(item.timestamp) }]}
              icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
              actions={
                <ActionPanel>
                  <Action
                    title="Paste Translation"
                    icon={Icon.Clipboard}
                    onAction={() => handleHistoryPaste(item)}
                  />
                  <Action
                    title="Copy Translation"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={() => handleHistoryCopy(item)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          title="AI Translator"
          description="Type text to translate or copy something to clipboard first"
          icon={Icon.Globe}
        />
      )}
    </List>
  );
}
