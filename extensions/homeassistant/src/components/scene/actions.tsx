import { HAOpenUrlInAction } from "@components/actions";
import { EntityStandardActionSections } from "@components/entity";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import React from "react";
import { callSceneActivateService } from "./utils";

export function SceneActivateAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (!s.entity_id.startsWith("scene")) {
    return null;
  }
  return (
    <Action
      title="Activate"
      onAction={() => callSceneActivateService(s)}
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
    />
  );
}

export function SceneEditInBrowserAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (s.entity_id.startsWith("scene")) {
    const id = props.state.attributes.id as number | undefined;
    if (id !== undefined) {
      const url = ha.navigateUrl(`config/scene/edit/${id}`);
      return (
        <HAOpenUrlInAction url={url} title="Edit" icon={Icon.Pencil} shortcut={{ modifiers: ["cmd"], key: "e" }} />
      );
    }
  }
  return null;
}

export function SceneActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <SceneActivateAction state={state} />
        <SceneEditInBrowserAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
