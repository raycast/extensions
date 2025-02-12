import { Action, ActionPanel, Form, List, LocalStorage, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";

export const DICTIONARY_ENTRIES_KEY = "dictate-dictionary-entries";

interface DictionaryEntry {
  original: string;
  correction: string;
  addedAt: number;
}

export default function Command() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    try {
      const savedEntries = await LocalStorage.getItem<string>(DICTIONARY_ENTRIES_KEY);
      if (savedEntries) {
        setEntries(JSON.parse(savedEntries));
      }
    } catch (error) {
      console.error("Error loading dictionary entries:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddEntry(values: { original: string; correction: string }) {
    try {
      const newEntry: DictionaryEntry = {
        original: values.original.trim(),
        correction: values.correction.trim(),
        addedAt: Date.now(),
      };

      const updatedEntries = [...entries, newEntry];
      await LocalStorage.setItem(DICTIONARY_ENTRIES_KEY, JSON.stringify(updatedEntries));
      setEntries(updatedEntries);
      await showHUD("✅ Word added to dictionary");
    } catch (error) {
      console.error("Error adding dictionary entry:", error);
      await showHUD("❌ Failed to add word to dictionary");
    }
  }

  async function handleDeleteEntry(entryToDelete: DictionaryEntry) {
    try {
      const updatedEntries = entries.filter((entry) => entry.addedAt !== entryToDelete.addedAt);
      await LocalStorage.setItem(DICTIONARY_ENTRIES_KEY, JSON.stringify(updatedEntries));
      setEntries(updatedEntries);
      await showHUD("✅ Word removed from dictionary");
    } catch (error) {
      console.error("Error deleting dictionary entry:", error);
      await showHUD("❌ Failed to remove word from dictionary");
    }
  }

  const filteredEntries = entries.filter(
    (entry) =>
      entry.original.toLowerCase().includes(searchText.toLowerCase()) ||
      entry.correction.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search dictionary entries..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Add New Word"
            target={
              <Form
                actions={
                  <ActionPanel>
                    <Action.SubmitForm title="Add Word" onSubmit={handleAddEntry} />
                  </ActionPanel>
                }
              >
                <Form.TextField
                  id="original"
                  title="Original Word/Phrase"
                  placeholder="Enter the word or phrase that needs correction"
                  autoFocus
                />
                <Form.TextField id="correction" title="Correction" placeholder="Enter the correct word or phrase" />
              </Form>
            }
          />
        </ActionPanel>
      }
    >
      <List.Section title="Dictionary Entries" subtitle={entries.length.toString()}>
        {filteredEntries.map((entry) => (
          <List.Item
            key={entry.addedAt}
            title={entry.original}
            subtitle={entry.correction}
            accessories={[{ text: new Date(entry.addedAt).toLocaleDateString() }]}
            actions={
              <ActionPanel>
                <Action
                  title="Delete Entry"
                  style={Action.Style.Destructive}
                  onAction={() => handleDeleteEntry(entry)}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
