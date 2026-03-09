import { List, ActionPanel, Action } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

type SavedWord = {
  id: string;
  title: string;
  meaning: string;
};

export default function Command() {
  const { value: savedWords = [], setValue: setSavedWords } = useLocalStorage<SavedWord[]>("saved_words", []);

  const unsaveWord = async (id: string) => {
    await setSavedWords(savedWords.filter((w) => w.id !== id));
  };

  return (
    <List searchBarPlaceholder="Search saved words...">
      {savedWords.map((word) => (
        <List.Item
          key={word.id}
          title={word.id.split("|")[0]}
          subtitle={word.title}
          accessories={[{ text: word.meaning }]}
          actions={
            <ActionPanel>
              <Action title="Unsave Word" onAction={() => unsaveWord(word.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
