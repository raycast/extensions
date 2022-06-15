import { Color, Action, Icon } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";

export function TimerStartAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("timer") || s.attributes.editable !== true) {
    return null;
  }
  const handle = async () => {
    await ha.callService("timer", "start", { entity_id: s.entity_id });
  };
  const title = s.state === "active" ? "Restart" : "Start";
  const iconSource = s.state === "active" ? Icon.TwoArrowsClockwise : "play.png";
  return (
    <Action
      title={title}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      onAction={handle}
      icon={{ source: iconSource, tintColor: Color.PrimaryText }}
    />
  );
}

export function TimerPauseAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("timer") || s.attributes.editable !== true) {
    return null;
  }
  const handle = async () => {
    await ha.callService("timer", "pause", { entity_id: s.entity_id });
  };
  return (
    <Action
      title="Pause"
      shortcut={{ modifiers: ["cmd"], key: "p" }}
      onAction={handle}
      icon={{ source: "pause.png", tintColor: Color.Green }}
    />
  );
}

export function TimerCancelAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("timer") || s.attributes.editable !== true) {
    return null;
  }
  const handle = async () => {
    await ha.callService("timer", "cancel", { entity_id: s.entity_id });
  };
  return (
    <Action
      title="Cancel"
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      onAction={handle}
      icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
    />
  );
}
