import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { deleteWord, DictionaryEntry, getAllWords } from "./db";

export default function Command() {
  const [words, setWords] = useState<DictionaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  async function loadWords() {
    try {
      const allWords = getAllWords();
      setWords(allWords);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Dictionary",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadWords();
  }, []);

  async function handleDelete(entry: DictionaryEntry) {
    const confirmed = await confirmAlert({
      title: "Delete Word",
      message: `Are you sure you want to delete "${entry.phrase}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        deleteWord(entry.id);
        setWords((prev) => prev.filter((w) => w.id !== entry.id));
        await showToast({
          style: Toast.Style.Success,
          title: "Word Deleted",
          message: `"${entry.phrase}" removed from dictionary`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async function handleCopy(entry: DictionaryEntry) {
    await Clipboard.copy(entry.phrase);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied",
      message: `"${entry.phrase}" copied to clipboard`,
    });
  }

  const filteredWords = words.filter(
    (w) =>
      w.phrase.toLowerCase().includes(searchText.toLowerCase()) ||
      (w.replacement &&
        w.replacement.toLowerCase().includes(searchText.toLowerCase())),
  );

  const manualWords = filteredWords.filter((w) => w.source === "manual");
  const learnedWords = filteredWords.filter((w) => w.source !== "manual");

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function renderWordItem(entry: DictionaryEntry) {
    const accessories: List.Item.Accessory[] = [];

    if (entry.frequencyUsed > 0) {
      accessories.push({
        text: `${entry.frequencyUsed}x`,
        tooltip: `Used ${entry.frequencyUsed} times`,
      });
    }

    if (entry.replacement) {
      accessories.push({
        tag: { value: entry.replacement, color: Color.Blue },
        tooltip: `Replaces with: ${entry.replacement}`,
      });
    }

    accessories.push({
      date: new Date(entry.createdAt),
      tooltip: `Added: ${formatDate(entry.createdAt)}`,
    });

    return (
      <List.Item
        key={entry.id}
        title={entry.phrase}
        subtitle={
          entry.source === "user_edits" ? "learned from corrections" : undefined
        }
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action
              title="Copy Word"
              icon={Icon.Clipboard}
              onAction={() => handleCopy(entry)}
            />
            <Action
              title="Delete Word"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={() => handleDelete(entry)}
            />
            <Action
              title="Refresh List"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={loadWords}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search words..."
      onSearchTextChange={setSearchText}
    >
      {filteredWords.length === 0 && !isLoading ? (
        <List.EmptyView
          title={searchText ? "No Matching Words" : "No Words in Dictionary"}
          description={
            searchText
              ? "Try a different search term"
              : "Use 'Add Word to Wispr Flow' to add your first word"
          }
          icon={Icon.Book}
        />
      ) : (
        <>
          {manualWords.length > 0 && (
            <List.Section
              title="Manual Entries"
              subtitle={`${manualWords.length} words`}
            >
              {manualWords.map(renderWordItem)}
            </List.Section>
          )}
          {learnedWords.length > 0 && (
            <List.Section
              title="Learned Words"
              subtitle={`${learnedWords.length} words`}
            >
              {learnedWords.map(renderWordItem)}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
