import { EntityStandardActionSections } from "@components/entity";
import { State } from "@lib/haapi";
import { Action, ActionPanel } from "@raycast/api";
import React from "react";
import { ZoneList } from "./list";

export function ZoneShowDetailAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (!s.entity_id.startsWith("zone")) {
    return null;
  }
  return <Action.Push title="Show Zone" target={<ZoneList state={s} />} />;
}

export function ZoneActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <ZoneShowDetailAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
