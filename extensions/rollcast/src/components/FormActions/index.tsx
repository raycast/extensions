import { Action, ActionPanel, Keyboard } from "@raycast/api";
import React, { FC } from "react";
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
      <Action.SubmitForm shortcut={shortcuts.submit} title={"Roll!"} onSubmit={onSubmit} />
      <Action title={"Copy Result"} onAction={onCopy} shortcut={shortcuts.copy} />
    </ActionPanel>
  );
};
