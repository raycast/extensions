import { EntityStandardActionSections } from "@components/entity";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import React from "react";

export function ButtonPressAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (!s.entity_id.startsWith("button")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("button", "press", { entity_id: s.entity_id });
  };
  return <Action title="Press" onAction={handle} icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }} />;
}

export function ButtonActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <ButtonPressAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
