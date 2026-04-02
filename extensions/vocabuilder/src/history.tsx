import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { posColor } from "./lib/colors";
import { useEffect, useState } from "react";
import LanguageConfigError from "./components/LanguageConfigError";
import { exportToFile, formatAnki, formatJson, formatQuizlet } from "./lib/export";
import { useLanguagePair } from "./hooks/useLanguagePair";
import { LanguagePair, storageKeyPrefix, swapLanguagePair } from "./lib/languages";
import { buildTranslationDetailMarkdown, buildTextTranslationDetailMarkdown } from "./lib/markdown";
import { clearHistory, deleteTranslation, getHistory } from "./lib/storage";
import { Translation } from "./lib/types";

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function History(props: { languagePair?: LanguagePair }) {
  const langResult = useLanguagePair();
  const initialPair = props.languagePair ?? langResult.pair;
  const [languagePair, setLanguagePair] = useState<LanguagePair | null>(initialPair);

  // Re-sync when preferences become valid after LanguageConfigError
  if (!languagePair && langResult.pair) {
    setLanguagePair(langResult.pair);
  }

  const [history, setHistory] = useState<Translation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [searchText, setSearchText] = useState("");

  const pairKey = languagePair ? storageKeyPrefix(languagePair) : null;

  useEffect(() => {
    if (!languagePair) return;
    setHistory([]);
    setIsLoading(true);
    let stale = false;
    getHistory(languagePair).then((h) => {
      if (!stale) {
        setHistory(h);
        setIsLoading(false);
      }
    });
    return () => {
      stale = true;
    };
  }, [pairKey]);

  if (!languagePair) return <LanguageConfigError message={langResult.error ?? "Invalid language configuration."} />;

  function handleToggleLanguages() {
    setSearchText("");
    setLanguagePair((prev) => {
      if (!prev) return prev;
      const swapped = swapLanguagePair(prev);
      showToast({
        style: Toast.Style.Success,
        title: `${swapped.source.name} → ${swapped.target.name}`,
      });
      return swapped;
    });
  }

  function ToggleLanguagesAction() {
    return (
      <Action
        title="Toggle Languages"
        icon={Icon.Switch}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        onAction={handleToggleLanguages}
      />
    );
  }

  const filtered = searchText
    ? history.filter(
        (t) =>
          t.word.toLowerCase().includes(searchText.toLowerCase()) ||
          t.translation.toLowerCase().includes(searchText.toLowerCase()),
      )
    : history;

  async function handleDelete(id: string) {
    if (!languagePair) return;
    const confirmed = await confirmAlert({
      title: "Delete Translation",
      message: "Remove this entry from your history?",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const deleted = await deleteTranslation(id, languagePair);
    if (!deleted) {
      await showToast({
        style: Toast.Style.Failure,
        title: "History storage is corrupted",
        message: "Delete skipped to avoid overwriting existing data.",
      });
      return;
    }

    setHistory((prev) => prev.filter((t) => t.id !== id));
    await showToast({ style: Toast.Style.Success, title: "Deleted" });
  }

  async function handleClearAll() {
    if (!languagePair) return;
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message: "This will permanently delete all saved translations.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    await clearHistory(languagePair);
    setHistory([]);
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }

  return (
    <List
      navigationTitle={`${languagePair.source.name} → ${languagePair.target.name}`}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search translations..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {filtered.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No translations yet"
          description="Use Translate to get started"
          actions={
            <ActionPanel>
              <ToggleLanguagesAction />
            </ActionPanel>
          }
        />
      ) : (
        filtered.map((item) => (
          <List.Item
            key={item.id}
            title={item.type === "text" ? truncate(item.word, 60) : item.word}
            subtitle={
              isShowingDetail ? undefined : item.type === "text" ? truncate(item.translation, 60) : item.translation
            }
            accessories={[
              item.type === "text"
                ? { tag: { value: "text", color: Color.Purple } }
                : { tag: { value: item.partOfSpeech, color: posColor(item.partOfSpeech) } },
              { text: relativeTime(item.timestamp) },
            ]}
            detail={
              <List.Item.Detail
                markdown={
                  item.type === "text"
                    ? buildTextTranslationDetailMarkdown(item.word, item.translation)
                    : buildTranslationDetailMarkdown(item)
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={isShowingDetail ? "Hide Detail" : "Show Detail"}
                  icon={Icon.Sidebar}
                  onAction={() => setIsShowingDetail((v) => !v)}
                />
                <Action.CopyToClipboard
                  title="Copy Translation"
                  content={item.translation}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => handleDelete(item.id)}
                />
                <ToggleLanguagesAction />
                <ActionPanel.Section title="Export">
                  <Action
                    title="Export as JSON"
                    icon={Icon.Document}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={async () => {
                      try {
                        const content = formatJson(history);
                        const filePath = exportToFile(content, "json");
                        await showInFinder(filePath);
                        await showToast({ style: Toast.Style.Success, title: "Exported", message: filePath });
                      } catch (err) {
                        await showToast({ style: Toast.Style.Failure, title: "Export failed", message: String(err) });
                      }
                    }}
                  />
                  <Action
                    title="Export to Anki"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={async () => {
                      const content = formatAnki(history);
                      if (!content) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Nothing to export",
                          message: "No word translations found",
                        });
                        return;
                      }
                      try {
                        const filePath = exportToFile(content, "anki");
                        await showInFinder(filePath);
                        await showToast({ style: Toast.Style.Success, title: "Exported for Anki", message: filePath });
                      } catch (err) {
                        await showToast({ style: Toast.Style.Failure, title: "Export failed", message: String(err) });
                      }
                    }}
                  />
                  <Action
                    title="Export to Quizlet"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
                    onAction={async () => {
                      const content = formatQuizlet(history);
                      if (!content) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Nothing to export",
                          message: "No word translations found",
                        });
                        return;
                      }
                      try {
                        const filePath = exportToFile(content, "quizlet");
                        await showInFinder(filePath);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Exported for Quizlet",
                          message: filePath,
                        });
                      } catch (err) {
                        await showToast({ style: Toast.Style.Failure, title: "Export failed", message: String(err) });
                      }
                    }}
                  />
                </ActionPanel.Section>
                <Action
                  title="Clear All History"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={handleClearAll}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
