import { Action, ActionPanel } from "@raycast/api";
import { PaletteFormFields, UseFormActionsObject } from "../../types";

interface SavePaletteActionsProps {
  handleSubmit: (values: PaletteFormFields) => boolean | void | Promise<boolean | void>;
  formActions: UseFormActionsObject;
  colorCount: number;
}

export function SavePaletteActions({ handleSubmit, formActions, colorCount }: SavePaletteActionsProps) {
  return (
    <ActionPanel>
      <Action.SubmitForm onSubmit={handleSubmit} />
      <Action title="Add New Color Field" onAction={formActions.addColor} shortcut={{ modifiers: ["cmd"], key: "n" }} />
      {colorCount > 1 && (
        <Action
          title="Remove Last Color"
          onAction={formActions.removeColor}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        />
      )}
      <Action title="Clear Form" onAction={formActions.clear} shortcut={{ modifiers: ["cmd", "shift"], key: "r" }} />
    </ActionPanel>
  );
}
