import { ActionPanel, Color, Icon, Action, Keyboard } from "@raycast/api";
import { KtoColorLike, miredToK, RGB, RGBtoColorLike } from "../color";
import { ha } from "../common";
import { State } from "../haapi";
import { ensureMinMax } from "../utils";
import { lightRGBColors } from "../constants";

function ceilRound50(value: number): number {
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

export function getLightRGBFromState(state: State): RGB | undefined {
  const rgb = state.attributes.rgb_color;
  if (rgb && Array.isArray(rgb) && rgb.length === 3) {
    return {
      r: rgb[0],
      g: rgb[1],
      b: rgb[2],
    };
  }
  return undefined;
}

export function BrightnessControlAction(props: { state: State }): JSX.Element | null {
  const state = props.state;

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
          <Action key={`${value}`} title={`${value} %`} onAction={() => handle(value)} />
        ))}
      </ActionPanel.Submenu>
    );
  }
  return null;
}

function BrightnessAddAction(props: {
  state: State;
  add: number;
  shortcut?: Keyboard.Shortcut | undefined;
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
      <Action
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

function getLightMinMaxK(state: State): [min: number | undefined, max: number | undefined] {
  const min_mireds = state.attributes.min_mireds as number | undefined;
  const max_mireds = state.attributes.max_mireds as number | undefined;
  if (min_mireds && max_mireds && max_mireds > min_mireds) {
    const maxK = Math.round(miredToK(min_mireds));
    const minK = Math.round(miredToK(max_mireds));
    return ensureMinMax(minK, maxK);
  }
  return [undefined, undefined];
}

export function ColorTempControlAction(props: { state: State }): JSX.Element | null {
  const state = props.state;
  const modes = state.attributes.supported_color_modes;

  const handle = async (K: number) => {
    await ha.callService("light", "turn_on", { entity_id: state.entity_id, kelvin: `${K}` });
  };

  const getKTempValues = (): number[] | undefined => {
    const [minK, maxK] = getLightMinMaxK(state);
    if (minK && maxK) {
      const result: number[] = [];
      const minK50 = ceilRound50(minK);
      if (minK50 > minK) {
        result.push(minK);
      }
      const maxK50 = ceilRound50(maxK);
      for (let i = minK50; i <= maxK50; i = i + 50) {
        result.push(i);
      }
      if (maxK < maxK) {
        result.push(maxK);
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
          <Action
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

function ColorTempControlAddAction(props: {
  state: State;
  add: number;
  shortcut?: Keyboard.Shortcut | undefined;
}): JSX.Element | null {
  const state = props.state;
  const modes = state.attributes.supported_color_modes;
  const add = props.add;

  const handle = async (K: number) => {
    await ha.callService("light", "turn_on", { entity_id: state.entity_id, kelvin: `${K}` });
  };

  if (modes && Array.isArray(modes) && modes.includes("color_temp")) {
    const mired = state.attributes.color_temp as number | undefined;
    if (mired === undefined) {
      return null;
    }
    const [minK, maxK] = getLightMinMaxK(state);
    if (minK === undefined || maxK === undefined) {
      return null;
    }
    const k = Math.round(miredToK(mired));
    let nextK = k + add;
    if (nextK === k) {
      nextK = k + add;
    }
    if (nextK === maxK || nextK === minK) {
      return null;
    } else if (nextK > maxK) {
      nextK = maxK;
    } else if (nextK < minK) {
      nextK = minK;
    }

    return (
      <Action
        key={`${nextK}`}
        title={`Color Temperature ${add < 0 ? "Down" : "Up"}`}
        icon={{ source: "lightbulb.png", tintColor: Color.PrimaryText }}
        shortcut={props.shortcut}
        onAction={() => handle(nextK)}
      />
    );
  }
  return null;
}

export function ColorTempControlUpAction(props: { state: State }): JSX.Element | null {
  return (
    <ColorTempControlAddAction state={props.state} add={50} shortcut={{ modifiers: ["cmd", "shift"], key: "+" }} />
  );
}

export function ColorTempControlDownAction(props: { state: State }): JSX.Element | null {
  return (
    <ColorTempControlAddAction state={props.state} add={-50} shortcut={{ modifiers: ["cmd", "shift"], key: "-" }} />
  );
}

export function ColorRgbControlAction(props: { state: State }): JSX.Element | null {
  const state = props.state;
  const modes = state.attributes.supported_color_modes;

  const handle = async (color_rgb: RGB) => {
    await ha.callService("light", "turn_on", {
      entity_id: state.entity_id,
      rgb_color: [color_rgb.r, color_rgb.g, color_rgb.b],
    });
  };

  if (modes && Array.isArray(modes) && modes.includes("rgb")) {
    return (
      <ActionPanel.Submenu
        title="Color RGB"
        icon={{ source: "lightbulb.png", tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
      >
        {lightRGBColors.map((color) => (
          <Action
            key={`${color.name}`}
            title={`${color.name.charAt(0).toUpperCase()}${color.name.slice(1)}`}
            icon={{ source: "lightbulb.png", tintColor: RGBtoColorLike(color.value) }}
            onAction={() => handle(color.value)}
          />
        ))}
      </ActionPanel.Submenu>
    );
  }
  return null;
}
