import { Action, Icon } from "@raycast/api";
import { Item } from "../../types";
import { NoteForm } from "../noteForm";

export function NoteFormView(props: { item: Item; onSave: (item: Item) => void }) {
  const { item, onSave } = props;

  return (
    <Action.Push
      title="Add Note"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      target={
        <NoteForm
          item={item}
          onSave={async function (item: Item): Promise<void> {
            props.onSave(item);
          }}
        />
      }
    />
  );
}
