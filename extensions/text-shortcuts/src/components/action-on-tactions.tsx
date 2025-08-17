import { Action, ActionPanel, Icon } from "@raycast/api";
import React from "react";
import { Taction, TactionType } from "../util/shortcut";

export function ActionOnTactions(props: {
  tactions: Taction[];
  setTactions: React.Dispatch<React.SetStateAction<Taction[]>>;
}) {
  const tactions = props.tactions;
  const setTactions = props.setTactions;
  return (
    <>
      <ActionPanel.Section title="Add Action">
        <Action
          title={TactionType.DELETE}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={async () => {
            setTactions([...tactions, { type: TactionType.DELETE, content: [""] }]);
          }}
        />
        <Action
          title={TactionType.CODER}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={async () => {
            setTactions([...tactions, { type: TactionType.CODER, content: [""] }]);
          }}
        />
        <Action
          title={TactionType.CASE}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={async () => {
            setTactions([...tactions, { type: TactionType.CASE, content: [""] }]);
          }}
        />
        <Action
          title={TactionType.REPLACE}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={async () => {
            setTactions([...tactions, { type: TactionType.REPLACE, content: [""] }]);
          }}
        />
        <Action
          title={TactionType.TRANSFORM}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={async () => {
            setTactions([...tactions, { type: TactionType.TRANSFORM, content: [""] }]);
          }}
        />
        <Action
          title={TactionType.AFFIX}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={async () => {
            setTactions([...tactions, { type: TactionType.AFFIX, content: [""] }]);
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Remove Action">
        <Action
          title="Remove Last Action"
          icon={Icon.Trash}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            const _tactions = [...tactions];
            _tactions.pop();
            setTactions(_tactions);
          }}
        />
        <Action
          title="Remove All Actions"
          icon={Icon.ExclamationMark}
          shortcut={{ modifiers: ["shift", "ctrl"], key: "x" }}
          onAction={async () => {
            setTactions([]);
          }}
        />
      </ActionPanel.Section>
    </>
  );
}
