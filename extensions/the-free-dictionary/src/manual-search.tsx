import {
  Action,
  ActionPanel,
  closeMainWindow,
  popToRoot,
  Form,
  getSelectedText,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import clean from "./utils/clean";
import { addToHistory } from "./utils/history";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");

  useEffect(() => {
    async function fetchSelectedText() {
      try {
        const text = await getSelectedText();
        setSearchText(clean(text));
      } catch {
        // No text selected, keep empty
      }
    }
    fetchSelectedText();
  }, []);

  async function handleSubmit(values: { word: string }) {
    const cleanedWord = clean(values.word);

    if (cleanedWord.length === 0)
      await showToast(Toast.Style.Failure, "No word entered", "Please enter a word to search in the dictionary.");
    else {
      try {
        await addToHistory(cleanedWord);
        await open(`https://tfd.com/${encodeURIComponent(cleanedWord)}`);
        await closeMainWindow();
        await popToRoot();
      } catch {
        await showToast(Toast.Style.Failure, "Unable to open dictionary");
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search in Dictionary" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="word"
        title="Word or expression"
        placeholder="Enter a word or expression to search"
        value={searchText}
        onChange={setSearchText}
      />
    </Form>
  );
}
