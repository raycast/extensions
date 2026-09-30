import { EntityStandardActionSections } from "@components/entity";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import React from "react";
import { InputDateTimeForm } from "./form";

export function InputDateTimeSetValueAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (!s.entity_id.startsWith("input_datetime")) {
    return null;
  }
  if (s.state === "unavailable") {
    return null;
  }
  const hasDate: boolean = s.attributes.has_date || false;
  const hasTime: boolean = s.attributes.has_time || false;
  let title = "";
  if (hasDate && hasTime) {
    title = "Set Date and Time";
  } else if (hasDate) {
    title = "Set Date";
  } else if (hasTime) {
    title = "Set Time";
  } else {
    return null;
  }
  return (
    <Action.Push
      title={title}
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
      target={<InputDateTimeForm state={s} hasDate={hasDate} hasTime={hasTime} />}
    />
  );
}

export function InputDateTimeActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <InputDateTimeSetValueAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
