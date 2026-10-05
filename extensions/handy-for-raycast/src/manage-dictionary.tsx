import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { showFailure } from "./lib/errors";
import { readSettings, updateSettings } from "./lib/settings";

function TermForm({ original, onSave }: { original?: string; onSave: () => void }) {
  const { pop } = useNavigation();
  const [term, setTerm] = useState(original ?? "");
  async function submit() {
    const next = term.trim();
    if (!next) return void (await showToast({ style: Toast.Style.Failure, title: "Enter a word or phrase" }));
    try {
      const settings = readSettings();
      const words = settings.custom_words ?? [];
      if (words.some((word) => word.toLocaleLowerCase() === next.toLocaleLowerCase() && word !== original))
        return void (await showToast({ style: Toast.Style.Failure, title: "That term is already in your dictionary" }));
      updateSettings({
        custom_words: original ? words.map((word) => (word === original ? next : word)) : [...words, next],
      });
      onSave();
      pop();
      await showToast({
        style: Toast.Style.Success,
        title: original ? "Dictionary term updated" : "Dictionary term added",
      });
    } catch (error) {
      await showFailure("Could not update dictionary", error);
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={original ? "Save Term" : "Add Term"}
            icon={original ? Icon.Checkmark : Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="term"
        title="Word or Phrase"
        placeholder="e.g. Raycast"
        value={term}
        onChange={setTerm}
        autoFocus
      />
    </Form>
  );
}

export default function Command() {
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setWords(readSettings().custom_words ?? []);
    } catch (error) {
      await showFailure("Could not read Handy's dictionary", error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function remove(word: string) {
    const okay = await confirmAlert({
      title: `Remove “${word}”?`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!okay) return;
    try {
      const current = readSettings().custom_words ?? [];
      const next = current.filter((item) => item !== word);
      updateSettings({ custom_words: next });
      setWords(next);
    } catch (error) {
      await showFailure("Could not remove dictionary term", error);
    }
  }

  async function importClipboard() {
    const text = await Clipboard.readText();
    const incoming = (text ?? "")
      .split(/[\n,]/u)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!incoming.length)
      return void (await showToast({ style: Toast.Style.Failure, title: "The clipboard has no words to import" }));
    try {
      const current = readSettings().custom_words ?? [];
      const seen = new Set(current.map((word) => word.toLocaleLowerCase()));
      const additions = incoming.filter((word) => {
        const key = word.toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (!additions.length) return void (await showToast({ title: "Everything is already imported" }));
      const next = [...current, ...additions];
      updateSettings({ custom_words: next });
      setWords(next);
      await showToast({ style: Toast.Style.Success, title: `Imported ${additions.length} terms` });
    } catch (error) {
      await showFailure("Could not import dictionary", error);
    }
  }

  const add = (
    <Action.Push
      title="Add Term"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<TermForm onSave={load} />}
    />
  );
  return (
    <List isLoading={loading} searchBarPlaceholder="Search dictionary…">
      {!loading && !words.length ? (
        <List.EmptyView
          icon={Icon.Book}
          title="Your Dictionary Is Empty"
          description="Add names, jargon, and phrases that Handy should recognize."
          actions={
            <ActionPanel>
              {add}
              <Action title="Import from Clipboard" icon={Icon.Download} onAction={importClipboard} />
            </ActionPanel>
          }
        />
      ) : (
        words.map((word, index) => (
          <List.Item
            key={`${word}-${index}`}
            icon={Icon.Text}
            title={word}
            accessories={[{ text: `#${index + 1}` }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {add}
                  <Action.Push
                    title="Edit Term"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={<TermForm original={word} onSave={load} />}
                  />
                  <Action.CopyToClipboard title="Copy Term" content={word} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action title="Import from Clipboard" icon={Icon.Download} onAction={importClipboard} />
                  <Action.CopyToClipboard title="Export Dictionary" content={words.join("\n")} icon={Icon.Upload} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Remove Term"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => remove(word)}
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
