import { Color, Icon, Action } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";

export function AutomationTriggerAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("automation") || s.state === "off") {
    return null;
  }
  const handle = async () => {
    await ha.callService("automation", "trigger", { entity_id: s.entity_id });
  };
  return <Action title="Trigger" onAction={handle} icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }} />;
}

export function AutomationTurnOnAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.entity_id.startsWith("automation") && s.state === "off") {
    const handle = async () => {
      await ha.callService("automation", "turn_on", { entity_id: s.entity_id });
    };
    return <Action title="Turn On" onAction={handle} icon={{ source: "power-btn.png", tintColor: Color.Green }} />;
  }
  return null;
}

export function AutomationTurnOffAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.entity_id.startsWith("automation") && s.state === "on") {
    const handle = async () => {
      await ha.callService("automation", "turn_off", { entity_id: s.entity_id });
    };
    return <Action title="Turn Off" onAction={handle} icon={{ source: "power-btn.png", tintColor: Color.Red }} />;
  }
  return null;
}
