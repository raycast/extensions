import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { ListErrorView } from "./components/error-view";
import { showHexFailure } from "./lib/feedback";
import { errorMessage, hex } from "./lib/hex";
import { DoneReply, VocabularyEntry, VocabularyReply } from "./lib/types";
import { planVocabularyEdit, splitSpellings, vocabularyAddArgs } from "./lib/vocabulary";

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(() => hex<VocabularyReply>(["vocabulary", "list"]), [], {
    onError: () => undefined,
  });
  const entries = data?.entries ?? [];
  const [searchText, setSearchText] = useState("");

  const addAction = (initialTerm?: string, shortcut?: Keyboard.Shortcut) => (
    <Action.Push
      title="Add Term"
      icon={Icon.Plus}
      shortcut={shortcut}
      target={<VocabularyForm initialTerm={initialTerm} onSaved={revalidate} />}
    />
  );

  return (
    <List isLoading={isLoading} filtering onSearchTextChange={setSearchText} searchBarPlaceholder="Search vocabulary">
      {error ? (
        <ListErrorView error={error} onRetry={revalidate} />
      ) : isLoading ? null : (
        <List.EmptyView
          icon={Icon.Book}
          title={searchText ? "No matching terms" : "No vocabulary yet"}
          description={searchText ? undefined : "Add names or words with your preferred spelling."}
          actions={<ActionPanel>{addAction(searchText.trim())}</ActionPanel>}
        />
      )}
      {entries.length > 0 && (
        <List.Section title="Terms" subtitle={String(entries.length)}>
          {entries.map((entry) => {
            const spellings = entry.sounds_like ?? [];
            return (
              <List.Item
                key={entry.term}
                icon={Icon.Book}
                title={entry.term}
                subtitle={spellings.length > 0 ? `sounds like ${spellings.join(", ")}` : undefined}
                keywords={spellings}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Push
                        title="Edit Term"
                        icon={Icon.Pencil}
                        target={<VocabularyForm entry={entry} onSaved={revalidate} />}
                      />
                      <Action.CopyToClipboard title="Copy Term" content={entry.term} />
                      {addAction(undefined, Keyboard.Shortcut.Common.New)}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Remove Term"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() => removeTerm(entry.term, revalidate)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

async function removeTerm(term: string, onRemoved: () => void) {
  const confirmed = await confirmAlert({
    title: `Remove “${term}”?`,
    message: "Hex removes this term and its “sounds like” spellings.",
    icon: Icon.Trash,
    primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;
  try {
    await hex(["vocabulary", "remove", term]);
    await showToast({ style: Toast.Style.Success, title: `Removed “${term}”` });
    onRemoved();
  } catch (error) {
    await showHexFailure(error, "Couldn't remove the term");
  }
}

type FormValues = { term: string; soundsLike: string };

function VocabularyForm({
  entry,
  initialTerm,
  onSaved,
}: {
  entry?: VocabularyEntry;
  initialTerm?: string;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const saving = useRef(false);
  const [isSaving, setSaving] = useState(false);

  async function save(values: FormValues) {
    if (saving.current) return;
    saving.current = true;
    setSaving(true);
    try {
      await saveTerm(values);
    } finally {
      saving.current = false;
      setSaving(false);
    }
  }

  async function saveTerm(values: FormValues) {
    const term = values.term.trim();
    if (!term) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a term" });
      return;
    }
    const spellings = splitSpellings(values.soundsLike);
    const steps = entry ? planVocabularyEdit(entry, term, spellings) : [vocabularyAddArgs(term, spellings)];
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving",
    });
    let removed = false;
    try {
      for (const step of steps) {
        await hex<DoneReply>(step);
        if (step[1] === "remove") removed = true;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't save the term";
      toast.message = errorMessage(error);
      if (removed && entry) {
        try {
          await hex(vocabularyAddArgs(entry.term, entry.sounds_like ?? []));
        } catch (restoreError) {
          toast.title = `Removed “${entry.term}” but couldn't add “${term}”`;
          toast.message = `Restoring it failed too: ${errorMessage(restoreError)}`;
        }
        onSaved();
      }
      return;
    }
    toast.style = Toast.Style.Success;
    toast.title = steps.length === 0 ? "No changes" : `Saved “${term}”`;
    onSaved();
    pop();
  }

  return (
    <Form
      isLoading={isSaving}
      navigationTitle={entry ? "Edit Term" : "Add Term"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={entry ? "Save Term" : "Add Term"} onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.TextField id="term" title="Term" placeholder="Raycast" defaultValue={entry?.term ?? initialTerm} />
      <Form.TextField
        id="soundsLike"
        title="Sounds Like"
        placeholder="ray cast, race cast"
        info="Spellings Hex uses by mistake. Separate them with commas."
        defaultValue={entry?.sounds_like?.join(", ")}
      />
    </Form>
  );
}
