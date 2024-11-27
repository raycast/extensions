import { Action, Icon } from "@raycast/api";
import { IntervalForm } from "../intervalForm";
import { Item } from "../../types";

export function NewInterval(props: { item?: Item; onSave: (item: Item) => void }) {
  return (
    <Action.Push
      title="New Interval"
      icon={Icon.Wand}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={
        <IntervalForm
          onSave={async function (item: Item): Promise<void> {
            props.onSave(item);
          }}
        />
      }
    />
  );
}
