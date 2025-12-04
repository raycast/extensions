import { Action, Icon } from "@raycast/api";
import { EditTimerForm } from "../EditTimerForm";
import { EnhancedItem, Item } from "../../types";

interface EditFastingProps {
  runningFast: Item;
  revalidate: () => Promise<EnhancedItem[]>;
}

export function EditFasting({ runningFast, revalidate }: EditFastingProps) {
  return (
    <Action.Push
      title="Edit Fasting"
      icon={Icon.Pencil}
      target={<EditTimerForm item={runningFast} onEdit={revalidate} />}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
    />
  );
}
