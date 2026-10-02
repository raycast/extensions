import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { noteToMarkdown } from "./format";
import { ItemDetailStore } from "./item-detail-store";
import { Item } from "./types";

/** Full note in its own view, with the original formatting. */
export function NoteView({ item, store }: { item: Item; store: ItemDetailStore }) {
  const concealSecrets = getPreferenceValues<Preferences>().copyPasswordTransient ?? true;
  const { data: detail, isLoading, error } = usePromise((current: Item) => store.load(current), [item]);
  const note = detail?.note;

  let markdown = "";
  if (error) markdown = "Couldn't load this note.";
  else if (note) markdown = noteToMarkdown(note);
  else if (!isLoading) markdown = "_This item has no note._";

  return (
    <Detail
      navigationTitle={item.title}
      isLoading={isLoading}
      markdown={markdown}
      actions={
        note ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Note" content={note} concealed={concealSecrets} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
