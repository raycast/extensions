import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Clipboard,
  showToast,
  Toast,
  showHUD,
  Icon,
  confirmAlert,
  Alert,
  Color,
} from "@raycast/api";
import {
  getHistory,
  deleteHistoryItem,
  clearHistory,
  TranslationHistoryItem,
} from "./history";

export default function Command() {
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setIsLoading(true);
    try {
      const items = await getHistory();
      setHistory(items);
    } catch (error) {
      console.error("Failed to load history:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load History",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopyTranslation(item: TranslationHistoryItem) {
    await Clipboard.copy(item.translatedText);
    await showHUD("✓ Copied translation");
  }

  async function handleCopyOriginal(item: TranslationHistoryItem) {
    await Clipboard.copy(item.originalText);
    await showHUD("✓ Copied original text");
  }

  async function handlePaste(item: TranslationHistoryItem) {
    await Clipboard.paste(item.translatedText);
    await showHUD("✓ Pasted translation");
  }

  async function handleDelete(item: TranslationHistoryItem) {
    try {
      await deleteHistoryItem(item.id);
      setHistory((prev) => prev.filter((h) => h.id !== item.id));
      showToast({
        style: Toast.Style.Success,
        title: "Deleted",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Delete",
      });
    }
  }

  async function handleClearAll() {
    const confirmed = await confirmAlert({
      title: "Clear All History?",
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await clearHistory();
        setHistory([]);
        showToast({
          style: Toast.Style.Success,
          title: "History Cleared",
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Clear History",
        });
      }
    }
  }

  // Filter history based on search
  const filteredHistory = searchText
    ? history.filter(
        (item) =>
          item.originalText.toLowerCase().includes(searchText.toLowerCase()) ||
          item.translatedText.toLowerCase().includes(searchText.toLowerCase()),
      )
    : history;

  // Format timestamp
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

  // Get language flag emoji
  function getLanguageFlag(lang: string): string {
    const flags: Record<string, string> = {
      vietnamese: "🇻🇳",
      english: "🇺🇸",
      chinese: "🇨🇳",
      japanese: "🇯🇵",
      korean: "🇰🇷",
      french: "🇫🇷",
      german: "🇩🇪",
      spanish: "🇪🇸",
    };
    return flags[lang.toLowerCase()] || "🌐";
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search translation history..."
      onSearchTextChange={setSearchText}
      isShowingDetail={filteredHistory.length > 0}
    >
      {filteredHistory.length === 0 ? (
        <List.EmptyView
          title={searchText ? "No Results" : "No Translation History"}
          description={
            searchText
              ? "Try a different search term"
              : "Translations will appear here after you translate text"
          }
          icon={Icon.List}
        />
      ) : (
        filteredHistory.map((item) => (
          <List.Item
            key={item.id}
            title={
              item.translatedText.length > 50
                ? item.translatedText.substring(0, 50) + "..."
                : item.translatedText
            }
            subtitle={formatTime(item.timestamp)}
            keywords={[item.originalText, item.translatedText]}
            accessories={[
              {
                text: `${getLanguageFlag(item.sourceLanguage)} → ${getLanguageFlag(item.targetLanguage)}`,
              },
            ]}
            icon={{ source: Icon.Globe, tintColor: Color.Blue }}
            detail={
              <List.Item.Detail
                markdown={`## Translation

**${item.sourceLanguage}** → **${item.targetLanguage}**

---

### Original
${item.originalText}

---

### Translation
${item.translatedText}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Source"
                      text={item.sourceLanguage}
                      icon={getLanguageFlag(item.sourceLanguage)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Target"
                      text={item.targetLanguage}
                      icon={getLanguageFlag(item.targetLanguage)}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Time"
                      text={new Date(item.timestamp).toLocaleString()}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Copy">
                  <Action
                    title="Copy Translation"
                    icon={Icon.Clipboard}
                    onAction={() => handleCopyTranslation(item)}
                  />
                  <Action
                    title="Copy Original"
                    icon={Icon.Document}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={() => handleCopyOriginal(item)}
                  />
                  <Action
                    title="Paste Translation"
                    icon={Icon.Text}
                    shortcut={{ modifiers: ["cmd"], key: "v" }}
                    onAction={() => handlePaste(item)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Manage">
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleDelete(item)}
                  />
                  <Action
                    title="Clear All History"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={handleClearAll}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadHistory}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
