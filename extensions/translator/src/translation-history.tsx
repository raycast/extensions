import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { clearTranslationHistory, readTranslationHistory, removeTranslationFromHistory } from "./history";
import type { TranslationHistoryEntry } from "./history";
import { translationOptionForTargetId } from "./translation-options";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function Command() {
  const [history, setHistory] = useState<TranslationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);

    try {
      setHistory(await readTranslationHistory());
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Load History",
        message: errorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function removeEntry(entry: TranslationHistoryEntry) {
    try {
      await removeTranslationFromHistory(entry.id);
      setHistory((currentHistory) => currentHistory.filter((item) => item.id !== entry.id));
      await showToast({
        style: Toast.Style.Success,
        title: "Translation Removed",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Remove Translation",
        message: errorMessage(error),
      });
    }
  }

  async function clearHistory() {
    const confirmed = await confirmAlert({
      title: "Clear All History?",
      message: "All locally stored translations will be removed.",
      primaryAction: {
        title: "Clear History",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await clearTranslationHistory();
      setHistory([]);
      await showToast({
        style: Toast.Style.Success,
        title: "History Cleared",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Clear History",
        message: errorMessage(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search translation history...">
      <List.EmptyView
        icon={Icon.Clock}
        title="No Translations Yet"
        description="Translations created by this extension will appear here."
      />
      {history.map((entry) => {
        const option = translationOptionForTargetId(entry.targetId);
        const targetName = option?.title ?? entry.targetName;

        return (
          <List.Item
            key={entry.id}
            id={entry.id}
            icon={option?.icon ?? Icon.Globe}
            title={{ value: compactText(entry.translatedText), tooltip: entry.translatedText }}
            subtitle={targetName}
            keywords={[entry.sourceText, entry.translatedText, targetName, entry.model]}
            detail={
              <List.Item.Detail
                markdown={historyDetail(entry)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Language"
                      text={targetName}
                      icon={option?.icon ?? Icon.Globe}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Date"
                      text={formatDate(entry.createdAt)}
                      icon={Icon.Calendar}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Model" text={entry.model} icon={Icon.ComputerChip} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Paste title="Paste Translation" content={entry.translatedText} />
                <Action.CopyToClipboard
                  title="Copy Translation"
                  content={entry.translatedText}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.CopyToClipboard title="Copy Original Text" content={entry.sourceText} />
                <ActionPanel.Section title="History">
                  <Action
                    title="Delete Translation"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => void removeEntry(entry)}
                  />
                  <Action
                    title="Clear History"
                    icon={Icon.DeleteDocument}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={() => void clearHistory()}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function historyDetail(entry: TranslationHistoryEntry): string {
  return [
    "## Translation",
    "",
    escapeMarkdown(entry.translatedText),
    "",
    "---",
    "",
    "## Original",
    "",
    escapeMarkdown(entry.sourceText),
  ].join("\n");
}

function compactText(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 90 ? `${compact.slice(0, 87)}...` : compact;
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]<>()#+\-.!|])/g, "\\$1");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return DATE_FORMATTER.format(date);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
