import { State } from "@lib/haapi";
import { Action, ActionPanel, Color } from "@raycast/api";
import { EntityStandardActionSections } from "../entity";
import {
  callInputBooleanToggleService,
  callInputBooleanTurnOffService,
  callInputBooleanTurnOnService,
  isEditableInputBoolean,
} from "./utils";

export function InputBooleanToggleAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!isEditableInputBoolean(s)) {
    return null;
  }
  return (
    <Action
      title="Toggle"
      onAction={() => callInputBooleanToggleService(props.state)}
      icon={{ source: "cached.svg", tintColor: Color.PrimaryText }}
    />
  );
}

export function InputBooleanOnAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!isEditableInputBoolean(s)) {
    return null;
  }
  return (
    <Action
      title="Turn On"
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      onAction={() => callInputBooleanTurnOnService(s)}
      icon={{ source: "power-on.svg", tintColor: Color.PrimaryText }}
    />
  );
}

export function InputBooleanOffAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!isEditableInputBoolean(s)) {
    return null;
  }
  return (
    <Action
      title="Turn Off"
      shortcut={{ modifiers: ["cmd"], key: "f" }}
      onAction={() => callInputBooleanTurnOffService(s)}
      icon={{ source: "power.svg", tintColor: Color.Red }}
    />
  );
}

export function InputBooleanActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <InputBooleanToggleAction state={state} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Controls">
        <InputBooleanOnAction state={state} />
        <InputBooleanOffAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
