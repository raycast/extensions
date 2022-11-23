import { Icon, Color, Action, ActionPanel } from "@raycast/api";
import React from "react";
import { ha } from "../common";
import { State } from "../haapi";
import { EntityAttributesList } from "./attributes";

export function OpenEntityHistoryAction(props: { state: State }): JSX.Element {
  const historyUrl = ha.urlJoin(`history?entity_id=${props.state.entity_id}`);
  return (
    <Action.OpenInBrowser
      title="Open History in Browser"
      icon={{ source: Icon.Text, tintColor: Color.PrimaryText }}
      url={historyUrl}
      shortcut={{ modifiers: ["cmd"], key: "h" }}
    />
  );
}

export function OpenEntityLogbookAction(props: { state: State }): JSX.Element {
  const historyUrl = ha.urlJoin(`logbook?entity_id=${props.state.entity_id}`);
  return (
    <Action.OpenInBrowser
      title="Open Logbook in Browser"
      icon={{ source: Icon.Text, tintColor: Color.PrimaryText }}
      url={historyUrl}
      shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
    />
  );
}

export function ShowAttributesAction(props: { state: State }): JSX.Element | null {
  if (props.state.attributes) {
    return (
      <Action.Push
        title="Show Attributes"
        target={<EntityAttributesList state={props.state} />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      />
    );
  } else {
    return null;
  }
}

export function CopyStateValueAction(props: { state: State }): JSX.Element {
  return (
    <Action.CopyToClipboard
      title="Copy State Value"
      content={props.state.state}
      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
    />
  );
}

export function CopyEntityIDAction(props: { state: State }): JSX.Element {
  return (
    <Action.CopyToClipboard
      title="Copy Entity ID"
      content={props.state.entity_id}
      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
    />
  );
}

export function EntityStandardActionSections(props: { state: State }): JSX.Element {
  const s = props.state;
  return (
    <React.Fragment>
      <ActionPanel.Section title="Attributes">
        <ShowAttributesAction state={props.state} />
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
