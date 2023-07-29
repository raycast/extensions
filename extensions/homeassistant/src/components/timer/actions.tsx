import { Color, Action, Icon } from "@raycast/api";
import { State } from "../../haapi";
import { callTimerCancelService, callTimerPauseService, callTimerStartService, isTimerEditable } from "./utils";

export function TimerStartAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!isTimerEditable(s)) {
    return null;
  }
  const title = s.state === "active" ? "Restart" : "Start";
  const iconSource = s.state === "active" ? Icon.ArrowClockwise : "play.png";
  return (
    <Action
      title={title}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      onAction={() => callTimerStartService(s)}
      icon={{ source: iconSource, tintColor: Color.PrimaryText }}
    />
  );
}

export function TimerPauseAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("timer") || s.attributes.editable !== true) {
    return null;
  }
  return (
    <Action
      title="Pause"
      shortcut={{ modifiers: ["cmd"], key: "p" }}
      onAction={() => callTimerPauseService(s)}
      icon={{ source: "pause.png", tintColor: Color.Green }}
    />
  );
}

export function TimerCancelAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!isTimerEditable(s) && s.state === "active") {
    return null;
  }
  return (
    <Action
      title="Cancel"
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      onAction={() => callTimerCancelService(s)}
      icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
    />
  );
}
