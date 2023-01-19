import { ActionPanel, Color, Icon, Action, Keyboard } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";
import { ensureMinMax } from "../utils";

function getSpeedValues(step: number): number[] {
  const result: number[] = [];
  for (let i = 100; i >= 0; i = i - step) {
    result.push(i);
  }

  return result;
}

export function FanSpeedControlAction(props: { state: State }): JSX.Element | null {
  const state = props.state;
  const step = state.attributes.percentage_step;

  const handle = async (pvalue: number) => {
    await ha.callService("fan", "turn_on", { entity_id: state.entity_id, percentage: `${pvalue}` });
  };

  const speedValues = getSpeedValues(step);
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
}): JSX.Element | null {
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

export function FanSpeedUpAction(props: { state: State }): JSX.Element | null {
  return <FanSpeedAddAction state={props.state} add={1} shortcut={{ modifiers: ["cmd"], key: "+" }} />;
}

export function FanSpeedDownAction(props: { state: State }): JSX.Element | null {
  return <FanSpeedAddAction state={props.state} add={-1} shortcut={{ modifiers: ["cmd"], key: "-" }} />;
}
