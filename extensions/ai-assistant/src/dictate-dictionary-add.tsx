import { Form, ActionPanel, Action, showHUD, getSelectedText, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { DICTIONARY_ENTRIES_KEY } from "./dictate-dictionary";

interface DictionaryEntry {
  original: string;
  correction: string;
  addedAt: number;
}

export default function Command() {
  const [selectedWord, setSelectedWord] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSelectedWord();
  }, []);

  async function loadSelectedWord() {
    try {
      const text = await getSelectedText();
      setSelectedWord(text.trim());
    } catch (error) {
      console.error("Error getting selected text:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(values: { correction: string }) {
    try {
      if (!selectedWord) {
        await showHUD("❌ No word selected");
        return;
      }

      // Load existing entries
      const savedEntries = await LocalStorage.getItem<string>(DICTIONARY_ENTRIES_KEY);
      const entries: DictionaryEntry[] = savedEntries ? JSON.parse(savedEntries) : [];

      // Add new entry
      const newEntry: DictionaryEntry = {
        original: selectedWord,
        correction: values.correction.trim(),
        addedAt: Date.now(),
      };

      const updatedEntries = [...entries, newEntry];
      await LocalStorage.setItem(DICTIONARY_ENTRIES_KEY, JSON.stringify(updatedEntries));
      await showHUD("✅ Word added to dictionary");
    } catch (error) {
      console.error("Error adding word to dictionary:", error);
      await showHUD("❌ Failed to add word to dictionary");
    }
  }

  if (!selectedWord) {
    return (
      <Form>
        <Form.Description text="Please select a word or phrase to add to the dictionary" />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to Dictionary" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add selected word to personal dictionary" />
      <Form.TextField id="original" title="Selected Word/Phrase" value={selectedWord} />
      <Form.TextField id="correction" title="Correction" placeholder="Enter the correct word or phrase" autoFocus />
    </Form>
  );
}
