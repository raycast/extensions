import { EntityStandardActionSections } from "@components/entity";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import {
  callVacuumLocateService,
  callVacuumPauseService,
  callVacuumReturnToBaseService,
  callVacuumStartService,
  callVacuumStopService,
  callVacuumTurnOffService,
  callVacuumTurnOnService,
  isVacuumEditable,
} from "./utils";

export function VacuumLocateAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!isVacuumEditable(s)) {
    return null;
  }
  return (
    <Action
      title="Locate"
      onAction={() => callVacuumLocateService(s)}
      icon={{ source: Icon.Binoculars, tintColor: Color.PrimaryText }}
    />
  );
}

export function VacuumStartAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!isVacuumEditable(s)) {
    return null;
  }
  return (
    <Action
      title="Start"
      onAction={() => callVacuumStartService(s)}
      icon={{ source: "play.svg", tintColor: Color.PrimaryText }}
    />
  );
}

export function VacuumPauseAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!isVacuumEditable(s)) {
    return null;
  }
  return (
    <Action
      title="Pause"
      onAction={() => callVacuumPauseService(s)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      icon={{ source: "pause.svg", tintColor: Color.PrimaryText }}
    />
  );
}

export function VacuumStopAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!isVacuumEditable(s)) {
    return null;
  }
  return (
    <Action
      title="Stop"
      onAction={() => callVacuumStopService(s)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      icon={{ source: "stop.svg", tintColor: Color.PrimaryText }}
    />
  );
}

export function VacuumTurnOnAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!isVacuumEditable(s)) {
    return null;
  }
  return (
    <Action
      title="Turn On"
      onAction={() => callVacuumTurnOnService(s)}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      icon={{ source: "power-on.svg", tintColor: Color.PrimaryText }}
    />
  );
}

export function VacuumTurnOffAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!isVacuumEditable(s)) {
    return null;
  }
  return (
    <Action
      title="Turn Off"
      onAction={() => callVacuumTurnOffService(s)}
      shortcut={{ modifiers: ["cmd"], key: "f" }}
      icon={{ source: "power-off.svg", tintColor: Color.PrimaryText }}
    />
  );
}

export function VacuumReturnToBaseAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!isVacuumEditable(s)) {
    return null;
  }
  return (
    <Action
      title="Return to Base"
      onAction={() => callVacuumReturnToBaseService(s)}
      shortcut={{ modifiers: ["cmd"], key: "b" }}
      icon={{ source: "home.svg", tintColor: Color.PrimaryText }}
    />
  );
}

export function VacuumActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <VacuumLocateAction state={state} />
        <VacuumStartAction state={state} />
        <VacuumPauseAction state={state} />
        <VacuumStopAction state={state} />
        <VacuumTurnOnAction state={state} />
        <VacuumTurnOffAction state={state} />
        <VacuumReturnToBaseAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
