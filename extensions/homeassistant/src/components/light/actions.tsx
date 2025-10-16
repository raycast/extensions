import { EntityStandardActionSections } from "@components/entity";
import { KtoColorLike, RGB, RGBtoColorLike, miredToK } from "@lib/color";
import { ha } from "@lib/common";
import { lightRGBColors } from "@lib/constants";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon, Keyboard } from "@raycast/api";
import React from "react";
import { ceilRound50, getLightBrightnessValues, getLightMinMaxK, hasLightBrightnessSupport } from "./utils";

export function BrightnessControlAction(props: { state: State }): React.ReactElement | null {
  const state = props.state;

  const handle = async (bvalue: number) => {
    await ha.callService("light", "turn_on", { entity_id: state.entity_id, brightness_pct: `${bvalue}` });
  };

  if (hasLightBrightnessSupport(state)) {
    const brightnessValues = getLightBrightnessValues();
    return (
      <ActionPanel.Submenu
        title="Brightness"
        icon={{ source: "lightbulb.svg", tintColor: Color.PrimaryText }}
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
}): React.ReactElement | null {
  const state = props.state;

  const handle = async (bvalue: number) => {
    await ha.callService("light", "turn_on", { entity_id: state.entity_id, brightness_pct: `${bvalue}` });
  };

  if (hasLightBrightnessSupport(state)) {
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

export function BrightnessUpAction(props: { state: State }): React.ReactElement | null {
  return <BrightnessAddAction state={props.state} add={1} shortcut={{ modifiers: ["cmd"], key: "+" }} />;
}

export function BrightnessDownAction(props: { state: State }): React.ReactElement | null {
  return <BrightnessAddAction state={props.state} add={-1} shortcut={{ modifiers: ["cmd"], key: "-" }} />;
}

export function ColorTempControlAction(props: { state: State }): React.ReactElement | null {
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
        icon={{ source: "lightbulb.svg", tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
      >
        {brightnessValues.map((value) => (
          <Action
            key={`${value}`}
            title={`${value} K`}
            icon={{ source: "lightbulb.svg", tintColor: KtoColorLike(value) }}
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
}): React.ReactElement | null {
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
        icon={{ source: "lightbulb.svg", tintColor: Color.PrimaryText }}
        shortcut={props.shortcut}
        onAction={() => handle(nextK)}
      />
    );
  }
  return null;
}

export function ColorTempControlUpAction(props: { state: State }): React.ReactElement | null {
  return (
    <ColorTempControlAddAction state={props.state} add={50} shortcut={{ modifiers: ["cmd", "shift"], key: "+" }} />
  );
}

export function ColorTempControlDownAction(props: { state: State }): React.ReactElement | null {
  return (
    <ColorTempControlAddAction state={props.state} add={-50} shortcut={{ modifiers: ["cmd", "shift"], key: "-" }} />
  );
}

export function ColorRgbControlAction(props: { state: State }): React.ReactElement | null {
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
        title="Color Rgb"
        icon={{ source: "lightbulb.svg", tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
      >
        {lightRGBColors.map((color) => (
          <Action
            key={`${color.name}`}
            title={`${color.name.charAt(0).toUpperCase()}${color.name.slice(1)}`}
            icon={{ source: "lightbulb.svg", tintColor: RGBtoColorLike(color.value) }}
            onAction={() => handle(color.value)}
          />
        ))}
      </ActionPanel.Submenu>
    );
  }
  return null;
}

export function LightActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <Action
          title="Toggle"
          onAction={async () => await ha.toggleLight(props.state.entity_id)}
          icon={{ source: "cached.svg", tintColor: Color.PrimaryText }}
        />
        <Action
          title="Turn On"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={async () => await ha.turnOnLight(props.state.entity_id)}
          icon={{ source: "power-on.svg", tintColor: Color.PrimaryText }}
        />
        <Action
          title="Turn Off"
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={async () => await ha.turnOffLight(props.state.entity_id)}
          icon={{ source: "power-off.svg", tintColor: Color.PrimaryText }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Brightness">
        <BrightnessControlAction state={state} />
        <BrightnessUpAction state={state} />
        <BrightnessDownAction state={state} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Color">
        <ColorTempControlAction state={state} />
        <ColorTempControlUpAction state={state} />
        <ColorTempControlDownAction state={state} />
        <ColorRgbControlAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
