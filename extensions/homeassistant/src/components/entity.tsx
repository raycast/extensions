import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import React from "react";
import { HAOpenUrlInAction } from "./actions";
import { EntityAttributesList } from "./attributes";

export function OpenEntityHistoryAction({ state }: { state: State }) {
  const historyUrl = ha.navigateUrl(`history?entity_id=${state.entity_id}`);
  return (
    <HAOpenUrlInAction
      action="Open History In"
      icon={{ source: Icon.Text, tintColor: Color.PrimaryText }}
      url={historyUrl}
      shortcut={{ modifiers: ["cmd"], key: "h" }}
    />
  );
}

export function OpenEntityLogbookAction({ state }: { state: State }) {
  const historyUrl = ha.navigateUrl(`logbook?entity_id=${state.entity_id}`);
  return (
    <HAOpenUrlInAction
      action="Open Logbook In"
      icon={{ source: Icon.Text, tintColor: Color.PrimaryText }}
      url={historyUrl}
      shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
    />
  );
}

export function ShowAttributesAction({ state }: { state: State }) {
  if (state.attributes) {
    return (
      <Action.Push
        title="Show Attributes"
        target={<EntityAttributesList state={state} />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      />
    );
  } else {
    return null;
  }
}

export function CopyStateValueAction({ state }: { state: State }) {
  return (
    <Action.CopyToClipboard
      title="Copy State Value"
      content={state.state}
      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
    />
  );
}

export function CopyEntityIDAction({ state }: { state: State }) {
  return (
    <Action.CopyToClipboard
      title="Copy Entity ID"
      content={state.entity_id}
      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
    />
  );
}

export function EntityStandardActionSections({ state: s }: { state: State }) {
  return (
    <React.Fragment>
      <ActionPanel.Section title="Attributes">
        <ShowAttributesAction state={s} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Values">
        <CopyEntityIDAction state={s} />
        <CopyStateValueAction state={s} />
      </ActionPanel.Section>
      <ActionPanel.Section title="History">
        <OpenEntityHistoryAction state={s} />
        <OpenEntityLogbookAction state={s} />
      </ActionPanel.Section>
    </React.Fragment>
  );
}
