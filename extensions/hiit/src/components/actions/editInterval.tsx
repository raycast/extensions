import { Action, Icon } from "@raycast/api";
import { IntervalForm } from "../intervalForm";
import { Item } from "../../types";

export function EditInterval(props: { item?: Item; onSave: (item: Item) => void }) {
  const item = props.item;

  return (
    <Action.Push
      title="Edit Interval"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      target={
        <IntervalForm
          item={item}
          onSave={async function (item: Item): Promise<void> {
            props.onSave(item);
          }}
        />
      }
    />
  );
}
