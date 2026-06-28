import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { FC } from "react";
import { RollForm } from "types";

const shortcuts: Record<string, Keyboard.Shortcut> = {
  submit: { key: "return", modifiers: [] },
  copy: { key: "c", modifiers: ["cmd", "opt"] },
};

interface Props {
  onSubmit: Action.SubmitForm.Props<RollForm>["onSubmit"];
  onCopy: Action.Props["onAction"];
}

export const FormActions: FC<Props> = ({ onSubmit, onCopy }) => {
  return (
    <ActionPanel>
      <Action.SubmitForm shortcut={shortcuts.submit} title={"Roll"} onSubmit={onSubmit} icon={Icon.Wand} />
      <Action title={"Copy Result"} onAction={onCopy} shortcut={shortcuts.copy} icon={Icon.CopyClipboard} />
    </ActionPanel>
  );
};
