import { EntityStandardActionSections } from "@components/entity";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import React from "react";
import { callInputButtonPressService, isEditableInputButton } from "./utils";

export function InputButtonPressAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (!isEditableInputButton(s)) {
    return null;
  }
  return (
    <Action
      title="Press"
      onAction={() => callInputButtonPressService(s)}
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
    />
  );
}

export function InputButtonActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <InputButtonPressAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
