import { EntityStandardActionSections } from "@components/entity";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import React from "react";

export function InputNumberIncrementAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (!s.entity_id.startsWith("input_number")) {
    return null;
  }
  if (s.state === "unavailable") {
    return null;
  }
  const value = Number(s.state);
  const max: number | undefined = s.attributes.max;
  const step: number | undefined = s.attributes.step;
  if (value === undefined || max === undefined || step === undefined) {
    return null;
  }
  if (value + step > max) {
    return null;
  }

  const handle = async () => {
    await ha.callService("input_number", "increment", { entity_id: s.entity_id });
  };
  return (
    <Action
      title="Increase"
      shortcut={{ modifiers: ["cmd"], key: "+" }}
      onAction={handle}
      icon={{ source: Icon.ChevronUp, tintColor: Color.PrimaryText }}
    />
  );
}

export function InputNumberDecrementAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (!s.entity_id.startsWith("input_number")) {
    return null;
  }
  if (s.state === "unavailable") {
    return null;
  }
  const value = Number(s.state);
  const min: number | undefined = s.attributes.min;
  const step: number | undefined = s.attributes.step;
  if (value === undefined || min === undefined || step === undefined) {
    return null;
  }
  if (value - step < min) {
    return null;
  }

  const handle = async () => {
    await ha.callService("input_number", "decrement", { entity_id: s.entity_id });
  };
  return (
    <Action
      title="Decrease"
      shortcut={{ modifiers: ["cmd"], key: "-" }}
      onAction={handle}
      icon={{ source: Icon.ChevronDown, tintColor: Color.PrimaryText }}
    />
  );
}

export function InputNumberActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <InputNumberIncrementAction state={state} />
        <InputNumberDecrementAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
