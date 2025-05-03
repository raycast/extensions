import { EntityStandardActionSections } from "@components/entity";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon, Keyboard } from "@raycast/api";
import React from "react";
import { getFanSpeedValues } from "./utils";

export function FanSpeedControlAction(props: { state: State }): React.ReactElement | null {
  const state = props.state;
  const step = state.attributes.percentage_step;

  const handle = async (pvalue: number) => {
    await ha.callService("fan", "turn_on", { entity_id: state.entity_id, percentage: `${pvalue}` });
  };

  const speedValues = getFanSpeedValues(step);
  return (
    <ActionPanel.Submenu title="Speed" icon="" shortcut={{ modifiers: ["cmd"], key: "p" }}>
      {speedValues.map((value) => (
        <Action key={`${value}`} title={`${value} %`} onAction={() => handle(value)} />
      ))}
    </ActionPanel.Submenu>
  );
}

function FanSpeedAddAction(props: {
  state: State;
  add: number;
  shortcut?: Keyboard.Shortcut | undefined;
}): React.ReactElement | null {
  const state = props.state;

  const handle = async (pvalue: number) => {
    await ha.callService("fan", "turn_on", { entity_id: state.entity_id, percentage: `${pvalue}` });
  };

  const speed = state.attributes.percentage as number | undefined;
  const step = state.attributes.percentage_step as number | undefined;

  if (!speed || !step) {
    return null;
  }

  const speedUp = speed + props.add * step;
  if (speedUp > 100 || speedUp < 0) {
    return null;
  }

  return (
    <Action
      title={`Speed ${props.add < 0 ? "Down" : "Up"}`}
      icon={{ source: props.add < 0 ? Icon.ChevronDown : Icon.ChevronUp, tintColor: Color.PrimaryText }}
      shortcut={props.shortcut}
      onAction={() => handle(speedUp)}
    />
  );
}

export function FanSpeedUpAction(props: { state: State }): React.ReactElement | null {
  return <FanSpeedAddAction state={props.state} add={1} shortcut={{ modifiers: ["cmd"], key: "+" }} />;
}

export function FanSpeedDownAction(props: { state: State }): React.ReactElement | null {
  return <FanSpeedAddAction state={props.state} add={-1} shortcut={{ modifiers: ["cmd"], key: "-" }} />;
}

export function FanActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <Action
          title="Toggle"
          onAction={async () => await ha.toggleFan(props.state.entity_id)}
          icon={{ source: "cached.svg", tintColor: Color.PrimaryText }}
        />
        <Action
          title="Turn On"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={async () => await ha.turnOnFan(props.state.entity_id)}
          icon={{ source: "power-on.svg", tintColor: Color.PrimaryText }}
        />
        <Action
          title="Turn Off"
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={async () => await ha.turnOffFan(props.state.entity_id)}
          icon={{ source: "power-off.svg", tintColor: Color.PrimaryText }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Speed">
        <FanSpeedControlAction state={state} />
        <FanSpeedUpAction state={state} />
        <FanSpeedDownAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
