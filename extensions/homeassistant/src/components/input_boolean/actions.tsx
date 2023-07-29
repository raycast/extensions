import { Color, Action } from "@raycast/api";
import { State } from "../../haapi";
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
      icon={{ source: "toggle.png", tintColor: Color.PrimaryText }}
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
      icon={{ source: "power-btn.png", tintColor: Color.Green }}
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
      icon={{ source: "power-btn.png", tintColor: Color.Red }}
    />
  );
}
