import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { readSettings, writeSettings } from "./lib/settings";

function AddWordForm({ onAdd }: { onAdd: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ word: string }>({
    onSubmit: async (values) => {
      const word = values.word.trim();
      try {
        const s = readSettings();
        const customWords = s.custom_words ?? [];
        if (customWords.includes(word)) {
          await showToast({
            style: Toast.Style.Failure,
            title: `'${word}' is already in dictionary`,
          });
          return;
        }
        writeSettings({ custom_words: [...customWords, word] });
        onAdd();
        pop();
        await showToast({
          style: Toast.Style.Success,
          title: `Added '${word}' to dictionary`,
        });
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update dictionary",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    validation: {
      word: (v) =>
        !v || v.trim().length === 0 ? "Word cannot be empty" : undefined,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Word" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Word"
        placeholder="e.g. TypeScript"
        {...itemProps.word}
      />
    </Form>
  );
}

export default function ManageDictionary() {
  const [words, setWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    try {
      setWords(readSettings().custom_words ?? []);
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not read dictionary",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(word: string) {
    try {
      const s = readSettings();
      writeSettings({
        custom_words: (s.custom_words ?? []).filter((w) => w !== word),
      });
      load();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete word",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const addAction = (
    <Action.Push
      title="Add Word"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<AddWordForm onAdd={load} />}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search words...">
      {words.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No custom words"
          description="Add one with ⌘N"
          actions={<ActionPanel>{addAction}</ActionPanel>}
        />
      ) : (
        words.map((word) => (
          <List.Item
            key={word}
            title={word}
            accessories={[{ icon: Icon.Trash }]}
            actions={
              <ActionPanel>
                {addAction}
                <Action
                  title="Delete Word"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(word)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
