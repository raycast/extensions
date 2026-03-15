import {
  List,
  ActionPanel,
  Action,
  Detail,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { DictionaryEntry, Preferences } from "./types";
import { getHistory, removeFromHistory, clearHistory, setCached } from "./utils/cache";
import { lookUpWord, providerLabel } from "./api/index";

function formatDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (hours < 1) return `${minutes}m ago`;
  if (days < 1) return `${hours}h ago`;
  return `${days}d ago`;
}

function buildMarkdown(entry: DictionaryEntry): string {
  const examples = entry.examples.map((ex, i) => `${i + 1}. ${ex}`).join("\n");
  return `# ${entry.word}\n\n${entry.definition}\n\n---\n\n## Examples\n\n${examples}`;
}

function buildCopyText(entry: DictionaryEntry): string {
  return [
    `${entry.word} (${entry.partOfSpeech}) ${entry.phonetic}`,
    "",
    entry.definition,
    "",
    "Examples:",
    ...entry.examples.map((ex, i) => `${i + 1}. ${ex}`),
    "",
    `Synonyms: ${entry.synonyms.join(", ")}`,
  ].join("\n");
}

function EntryDetail({ entry, onRefetch }: { entry: DictionaryEntry; onRefetch: (updated: DictionaryEntry) => void }) {
  const { apiKey } = getPreferenceValues<Preferences>();
  const [current, setCurrent] = useState(entry);
  const [isLoading, setIsLoading] = useState(false);

  async function refetch() {
    setIsLoading(true);
    await showToast({ style: Toast.Style.Animated, title: `Re-fetching "${current.word}"…` });
    try {
      const result = await lookUpWord(current.word, apiKey);
      await setCached(result);
      setCurrent(result);
      onRefetch(result);
      await showToast({ style: Toast.Style.Success, title: "Updated" });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to re-fetch",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(current)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Pronunciation" text={current.phonetic || "—"} />
          <Detail.Metadata.Label title="Part of Speech" text={current.partOfSpeech || "—"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Synonyms">
            {current.synonyms.map((s) => (
              <Detail.Metadata.TagList.Item key={s} text={s} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Cached" text={formatDate(current.cachedAt)} />
          <Detail.Metadata.Label
            title="Powered by"
            text={providerLabel(current.provider as "gemini" | "claude" | "openai")}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Definition" content={buildCopyText(current)} />
          <Action
            title="Re-fetch from API"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refetch}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [history, setHistory] = useState<DictionaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getHistory().then((entries) => {
      setHistory(entries);
      setIsLoading(false);
    });
  }, []);

  function handleRefetch(updated: DictionaryEntry) {
    setHistory((prev) => prev.map((e) => (e.word === updated.word ? updated : e)));
  }

  async function handleRemove(entry: DictionaryEntry) {
    await removeFromHistory(entry.word);
    setHistory((prev) => prev.filter((e) => e.word !== entry.word));
    await showToast({ style: Toast.Style.Success, title: `Removed "${entry.word}"` });
  }

  async function handleClearAll() {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message: "This will permanently delete all cached definitions. This cannot be undone.",
      primaryAction: { title: "Clear All", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await clearHistory();
    setHistory([]);
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search history…">
      {history.length === 0 && !isLoading ? (
        <List.EmptyView title="No history yet" description="Look up a word to get started" />
      ) : (
        history.map((entry) => (
          <List.Item
            key={entry.word}
            title={entry.word}
            subtitle={entry.partOfSpeech}
            accessories={[{ text: formatDate(entry.cachedAt) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Show Definition"
                  onAction={() => push(<EntryDetail entry={entry} onRefetch={handleRefetch} />)}
                />
                <Action.CopyToClipboard
                  title="Copy Definition"
                  content={buildCopyText(entry)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Remove from History"
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  onAction={() => handleRemove(entry)}
                />
                <Action
                  title="Clear All History"
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
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
