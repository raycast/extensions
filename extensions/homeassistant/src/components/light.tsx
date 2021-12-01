import { ActionPanel, Color, Icon, KeyboardShortcut } from "@raycast/api";
import { KtoColorLike, miredToK } from "../color";
import { ha } from "../common";
import { State } from "../haapi";

function round50(value: number): number {
  return Math.ceil(value / 50) * 50;
}

function getBrightnessValues(): number[] {
  const result: number[] = [];
  for (let i = 100; i >= 0; i = i - 10) {
    result.push(i);
  }
  return result;
}

function hasBrightnessSupport(state: State): boolean {
  const modes = state.attributes.supported_color_modes;
  if (modes && Array.isArray(modes) && (modes.includes("brightness") || modes.includes("color_temp"))) {
    // we assume that brightness support exists when color_temp is present.
    // This is required to support which does not provide brightness support mode
    return true;
  }
  return false;
}

export function BrightnessControlAction(props: { state: State }): JSX.Element | null {
  const state = props.state;
  const modes = state.attributes.supported_color_modes;

  const handle = async (bvalue: number) => {
    await ha.callService("light", "turn_on", { entity_id: state.entity_id, brightness_pct: `${bvalue}` });
  };

  if (hasBrightnessSupport(state)) {
    const brightnessValues = getBrightnessValues();
    return (
      <ActionPanel.Submenu
        title="Brightness"
        icon={{ source: "lightbulb.png", tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
      >
        {brightnessValues.map((value) => (
          <ActionPanel.Item key={`${value}`} title={`${value} %`} onAction={() => handle(value)} />
        ))}
      </ActionPanel.Submenu>
    );
  }
  return null;
}

function BrightnessAddAction(props: {
  state: State;
  add: number;
  shortcut?: KeyboardShortcut | undefined;
}): JSX.Element | null {
  const state = props.state;

  const handle = async (bvalue: number) => {
    await ha.callService("light", "turn_on", { entity_id: state.entity_id, brightness_pct: `${bvalue}` });
  };

  if (hasBrightnessSupport(state)) {
    const brightness = state.attributes.brightness as number | undefined;
    if (!brightness) {
      return null;
    }
    const brightnessPct = Math.round((brightness / 255) * 100);
    const brightnessPctUp = brightnessPct + props.add;
    if (brightnessPctUp > 100 || brightnessPctUp < 0) {
      return null;
    }
    return (
      <ActionPanel.Item
        title={`Brightness ${props.add < 0 ? "Down" : "Up"}`}
        icon={{ source: props.add < 0 ? Icon.ChevronDown : Icon.ChevronUp, tintColor: Color.PrimaryText }}
        shortcut={props.shortcut}
        onAction={() => handle(brightnessPctUp)}
      />
    );
  }
  return null;
}

export function BrightnessUpAction(props: { state: State }): JSX.Element | null {
  return <BrightnessAddAction state={props.state} add={1} shortcut={{ modifiers: ["cmd"], key: "+" }} />;
}

export function BrightnessDownAction(props: { state: State }): JSX.Element | null {
  return <BrightnessAddAction state={props.state} add={-1} shortcut={{ modifiers: ["cmd"], key: "-" }} />;
}

export function ColorTempControlAction(props: { state: State }): JSX.Element | null {
  const state = props.state;
  const modes = state.attributes.supported_color_modes;

  const handle = async (K: number) => {
    await ha.callService("light", "turn_on", { entity_id: state.entity_id, kelvin: `${K}` });
  };

  const ensureMinMax = (v1: number, v2: number): [min: number, max: number] => {
    if (v1 < v2) {
      return [v1, v2];
    }
    return [v2, v1];
  };

  const getKTempValues = (): number[] | undefined => {
    const min_mireds = state.attributes.min_mireds as number | undefined;
    const max_mireds = state.attributes.max_mireds as number | undefined;
    if (min_mireds && max_mireds && max_mireds > min_mireds) {
      const result: number[] = [];
      const maxK = Math.round(miredToK(min_mireds));
      const minK = Math.round(miredToK(max_mireds));
      const [min, max] = ensureMinMax(minK, maxK);
      const minK50 = round50(min);
      if (minK50 > min) {
        result.push(min);
      }
      const maxK50 = round50(max);
      for (let i = minK50; i <= maxK50; i = i + 50) {
        result.push(i);
      }
      if (maxK < max) {
        result.push(max);
      }
      return result;
    }
    return undefined;
  };

  if (modes && Array.isArray(modes) && modes.includes("color_temp")) {
    const brightnessValues = getKTempValues();
    if (brightnessValues === undefined) {
      return null;
    }
    return (
      <ActionPanel.Submenu
        title="Color Temperature"
        icon={{ source: "lightbulb.png", tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
      >
        {brightnessValues.map((value) => (
          <ActionPanel.Item
            key={`${value}`}
            title={`${value} K`}
            icon={{ source: "lightbulb.png", tintColor: KtoColorLike(value) }}
            onAction={() => handle(value)}
          />
        ))}
      </ActionPanel.Submenu>
    );
  }
  return null;
}
