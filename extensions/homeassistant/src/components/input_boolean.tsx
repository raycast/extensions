import { Color, Action } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";

export function InputBooleanToggleAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("input_boolean") || s.attributes.editable !== true) {
    return null;
  }
  const handle = async () => {
    await ha.callService("input_boolean", "toggle", { entity_id: s.entity_id });
  };
  return <Action title="Toggle" onAction={handle} icon={{ source: "toggle.png", tintColor: Color.PrimaryText }} />;
}

export function InputBooleanOnAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("input_boolean") || s.attributes.editable !== true) {
    return null;
  }
  const handle = async () => {
    await ha.callService("input_boolean", "turn_on", { entity_id: s.entity_id });
  };
  return (
    <Action
      title="Turn On"
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      onAction={handle}
      icon={{ source: "power-btn.png", tintColor: Color.Green }}
    />
  );
}

export function InputBooleanOffAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("input_boolean") || s.attributes.editable !== true) {
    return null;
  }
  const handle = async () => {
    await ha.callService("input_boolean", "turn_off", { entity_id: s.entity_id });
  };
  return (
    <Action
      title="Turn Off"
      shortcut={{ modifiers: ["cmd"], key: "f" }}
      onAction={handle}
      icon={{ source: "power-btn.png", tintColor: Color.Red }}
    />
  );
}
