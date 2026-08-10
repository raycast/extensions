import { EntityStandardActionSections } from "@components/entity";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import React from "react";
import { InputTextForm } from "./form";

export function InputTextSetValueAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (!s.entity_id.startsWith("input_text")) {
    return null;
  }
  if (s.state === "unavailable") {
    return null;
  }
  return (
    <Action.Push
      title="Set Text"
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
      target={<InputTextForm state={s} />}
    />
  );
}

export function InputTextActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <InputTextSetValueAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
