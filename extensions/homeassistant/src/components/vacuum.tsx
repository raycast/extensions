import { ActionPanel, Icon, Color } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";

export function VacuumLocateAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("vacuum")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("vacuum", "locate", { entity_id: s.entity_id });
  };
  return (
    <ActionPanel.Item
      title="Locate"
      onAction={handle}
      icon={{ source: Icon.Binoculars, tintColor: Color.PrimaryText }}
    />
  );
}

export function VacuumStartAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("vacuum")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("vacuum", "start", { entity_id: s.entity_id });
  };
  return (
    <ActionPanel.Item
      title="Start"
      onAction={handle}
      shortcut={{ modifiers: ["cmd"], key: "p" }}
      icon={{ source: "play.png", tintColor: Color.PrimaryText }}
    />
  );
}

export function VacuumPauseAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("vacuum")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("vacuum", "pause", { entity_id: s.entity_id });
  };
  return (
    <ActionPanel.Item
      title="Pause"
      onAction={handle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      icon={{ source: "pause.png", tintColor: Color.PrimaryText }}
    />
  );
}

export function VacuumStopAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("vacuum")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("vacuum", "stop", { entity_id: s.entity_id });
  };
  return (
    <ActionPanel.Item
      title="Stop"
      onAction={handle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      icon={{ source: Icon.XmarkCircle, tintColor: Color.PrimaryText }}
    />
  );
}

export function VacuumTurnOnAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("vacuum")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("vacuum", "turn_on", { entity_id: s.entity_id });
  };
  return (
    <ActionPanel.Item
      title="Turn On"
      onAction={handle}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      icon={{ source: "power-btn.png", tintColor: Color.Green }}
    />
  );
}

export function VacuumTurnOffAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("vacuum")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("vacuum", "turn_off", { entity_id: s.entity_id });
  };
  return (
    <ActionPanel.Item
      title="Turn Off"
      onAction={handle}
      shortcut={{ modifiers: ["cmd"], key: "f" }}
      icon={{ source: "power-btn.png", tintColor: Color.Red }}
    />
  );
}

export function VacuumReturnToBaseAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("vacuum")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("vacuum", "return_to_base", { entity_id: s.entity_id });
  };
  return (
    <ActionPanel.Item
      title="Return to Base"
      onAction={handle}
      shortcut={{ modifiers: ["cmd"], key: "b" }}
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
    />
  );
}
