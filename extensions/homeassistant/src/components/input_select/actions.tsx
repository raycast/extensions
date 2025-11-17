import { EntityStandardActionSections } from "@components/entity";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import React from "react";
import { callInputSelectSelectOptionService, getInputSelectSelectableOptions } from "./utils";

export function InputSelectOptionSelectAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  const selectableOptions = getInputSelectSelectableOptions(s);
  if (!selectableOptions || selectableOptions.length <= 0) {
    return null;
  }
  return (
    <ActionPanel.Submenu title="Select" icon={{ source: Icon.ChevronUp, tintColor: Color.PrimaryText }}>
      {selectableOptions?.map((o) => (
        <Action key={o} title={o} onAction={() => callInputSelectSelectOptionService(s, o)} />
      ))}
    </ActionPanel.Submenu>
  );
}

export function InputSelectActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <InputSelectOptionSelectAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
