import { Action, ActionPanel, environment, Grid, Icon } from "@raycast/api";
import type { CssColor, Group, Light } from "./lib/types";
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, BRIGHTNESSES, COLORS } from "./helpers/constants";
import ManageHueBridge from "./components/ManageHueBridge";
import UnlinkAction from "./components/UnlinkAction";
import { useHue } from "./hooks/useHue";
import React from "react";
import { getProgressIcon } from "@raycast/utils";
import useInputRateLimiter from "./hooks/useInputRateLimiter";
import {
  calculateAdjustedBrightness,
  calculateAdjustedColorTemperature,
  getClosestBrightness,
  hexToXy,
} from "./helpers/colors";
import { getLightsFromGroup, getMiredFromLight } from "./helpers/hueResources";
import { byName } from "./helpers/collections";
import { applyUpdate, getIconForColor, withTransition } from "./helpers/raycast";
import { createLightIcon } from "./helpers/svgImages";

export default function ControlLights() {
  const useHueObject = useHue();
  const { hueBridgeState, sendHueMessage, isLoading, lights, rooms, zones } = useHueObject;
  const rateLimiter = useInputRateLimiter(10, 1000);

  const groups = [...rooms, ...zones].sort(byName);

  const manageHueBridgeElement = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  return (
    <Grid isLoading={isLoading} filtering={{ keepSectionOrder: true }} columns={8}>
      {groups.map((group: Group) => {
        return (
          <Group
            key={group.id}
            group={group}
            lights={getLightsFromGroup(lights, group).sort(byName)}
            useHue={useHueObject}
            rateLimiter={rateLimiter}
          />
        );
      })}
    </Grid>
  );
}

function Group(props: {
  group: Group;
  lights: Light[];
  useHue: ReturnType<typeof useHue>;
  rateLimiter: ReturnType<typeof useInputRateLimiter>;
}) {
  return (
    <Grid.Section title={props.group.metadata.name}>
      {props.lights.map(
        (light: Light): React.JSX.Element => (
          <Light
            key={light.id}
            light={light}
            group={props.group}
            useHue={props.useHue}
            rateLimiter={props.rateLimiter}
          />
        ),
      )}
    </Grid.Section>
  );
}

function Light(props: {
  light: Light;
  group: Group;
  useHue: ReturnType<typeof useHue>;
  rateLimiter: ReturnType<typeof useInputRateLimiter>;
}) {
  return (
    <Grid.Item
      title={props.light.metadata.name}
      content={createLightIcon(props.light)}
      keywords={[props.group.metadata.name]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ToggleLightAction
              light={props.light}
              onToggle={() => handleToggle(props.useHue, props.rateLimiter, props.light)}
            />
            {props.light.dimming !== undefined && (
              <SetBrightnessAction
                light={props.light}
                onSet={(percentage: number) =>
                  handleSetBrightness(props.useHue, props.rateLimiter, props.light, percentage)
                }
              />
            )}
            {props.light.dimming !== undefined && (
              <IncreaseBrightnessAction
                light={props.light}
                onIncrease={() => handleBrightnessChange(props.useHue, props.rateLimiter, props.light, "increase")}
              />
            )}
            {props.light.dimming !== undefined && (
              <DecreaseBrightnessAction
                light={props.light}
                onDecrease={() => handleBrightnessChange(props.useHue, props.rateLimiter, props.light, "decrease")}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            {props.light.color !== undefined && (
              <SetColorAction
                light={props.light}
                onSet={(color: CssColor) => handleSetColor(props.useHue, props.rateLimiter, props.light, color)}
              />
            )}
            {props.light.color_temperature !== undefined && (
              <MakeWarmerAction
                light={props.light}
                onAction={() => handleColorTemperatureChange(props.useHue, props.rateLimiter, props.light, "warmer")}
              />
            )}
            {props.light.color_temperature !== undefined && (
              <MakeCoolerAction
                light={props.light}
                onAction={() => handleColorTemperatureChange(props.useHue, props.rateLimiter, props.light, "cooler")}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <UnlinkAction sendHueMessage={props.useHue.sendHueMessage} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ToggleLightAction(props: { light: Light; onToggle: () => void }) {
  return (
    <Action
      title={`Turn ${props.light.metadata.name} ${props.light.on.on ? "Off" : "On"}`}
      icon={props.light.on.on ? Icon.LightBulbOff : Icon.LightBulb}
      onAction={props.onToggle}
    />
  );
}

function SetBrightnessAction(props: { light: Light; onSet: (percentage: number) => void }) {
  return (
    <ActionPanel.Submenu
      title="Set Brightness"
      icon={getProgressIcon(
        (props.light.dimming?.brightness ?? 0) / 100,
        environment.appearance === "light" ? "#000" : "#fff",
      )}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "b" },
        Windows: { modifiers: ["ctrl", "shift"], key: "b" },
      }}
    >
      {BRIGHTNESSES.map((brightness) => (
        <Action key={brightness} title={`${brightness}% Brightness`} onAction={() => props.onSet(brightness)} />
      ))}
    </ActionPanel.Submenu>
  );
}

function IncreaseBrightnessAction(props: { light: Light; onIncrease: () => void }) {
  if (props.light.dimming === undefined || getClosestBrightness(props.light.dimming.brightness) >= BRIGHTNESS_MAX) {
    return null;
  }

  return (
    <Action
      title="Increase Brightness"
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "arrowUp" },
        Windows: { modifiers: ["ctrl", "shift"], key: "arrowUp" },
      }}
      icon={Icon.Plus}
      onAction={props.onIncrease}
    />
  );
}

function DecreaseBrightnessAction(props: { light: Light; onDecrease: () => void }) {
  if (props.light.dimming === undefined || getClosestBrightness(props.light.dimming.brightness) <= BRIGHTNESS_MIN) {
    return null;
  }

  return (
    <Action
      title="Decrease Brightness"
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "arrowDown" },
        Windows: { modifiers: ["ctrl", "shift"], key: "arrowDown" },
      }}
      icon={Icon.Minus}
      onAction={props.onDecrease}
    />
  );
}

function SetColorAction(props: { light: Light; onSet: (color: CssColor) => void }) {
  return (
    <ActionPanel.Submenu
      title="Set Color"
      icon={Icon.Swatch}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "c" },
        Windows: { modifiers: ["ctrl", "shift"], key: "c" },
      }}
    >
      {COLORS.map((color) => (
        <Action key={color.name} title={color.name} icon={getIconForColor(color)} onAction={() => props.onSet(color)} />
      ))}
    </ActionPanel.Submenu>
  );
}

// Warmer is a higher mired, and a lower color temperature in Kelvin.
function MakeWarmerAction(props: { light: Light; onAction: () => void }) {
  const { color_temperature } = props.light;
  if (!color_temperature || getMiredFromLight(props.light) >= color_temperature.mirek_schema.mirek_maximum) {
    return null;
  }

  return (
    <Action
      title="Make Warmer"
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "arrowLeft" },
        Windows: { modifiers: ["ctrl", "shift"], key: "arrowLeft" },
      }}
      icon={Icon.Sun}
      onAction={props.onAction}
    />
  );
}

function MakeCoolerAction(props: { light: Light; onAction: () => void }) {
  const { color_temperature } = props.light;
  if (!color_temperature || getMiredFromLight(props.light) <= color_temperature.mirek_schema.mirek_minimum) {
    return null;
  }

  return (
    <Action
      title="Make Cooler"
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "arrowRight" },
        Windows: { modifiers: ["ctrl", "shift"], key: "arrowRight" },
      }}
      icon={Icon.Snowflake}
      onAction={props.onAction}
    />
  );
}

function handleToggle(
  hue: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  light: Light,
) {
  const changes = {
    on: { on: !light.on.on },
    ...(light.dimming ? { dimming: { brightness: light.dimming.brightness } } : {}),
  };

  return applyUpdate(hue, {
    rateLimiter,
    lights: new Map([[light.id, changes]]),
    request: (hueClient) => hueClient.updateLight(light, withTransition(changes)),
    success: `Turned ${light.on.on ? "off" : "on"} ${light.metadata.name}`,
    failure: `Failed turning ${light.on.on ? "off" : "on"} ${light.metadata.name}`,
  });
}

function handleSetBrightness(
  hue: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  light: Light,
  brightness: number,
) {
  const changes = {
    on: { on: true },
    dimming: { brightness: brightness },
  };

  return applyUpdate(hue, {
    rateLimiter,
    lights: new Map([[light.id, changes]]),
    request: (hueClient) => hueClient.updateLight(light, withTransition(changes)),
    success: `Set brightness of ${light.metadata.name} to ${(brightness / 100).toLocaleString("en", { style: "percent" })}`,
    failure: `Failed setting brightness of ${light.metadata.name}`,
  });
}

function handleBrightnessChange(
  hue: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  light: Light,
  direction: "increase" | "decrease",
) {
  const adjustedBrightness = calculateAdjustedBrightness(light.dimming?.brightness ?? 0, direction);
  const changes = {
    on: { on: true },
    // dimming_delta exists, but manually calculating the new value
    // enables the usage of the value in the optimistic update.
    dimming: { brightness: adjustedBrightness },
  };

  return applyUpdate(hue, {
    rateLimiter,
    lights: new Map([[light.id, changes]]),
    request: (hueClient) => hueClient.updateLight(light, withTransition(changes)),
    success: `${direction === "increase" ? "Increased" : "Decreased"} brightness of ${light.metadata.name} to ${(adjustedBrightness / 100).toLocaleString("en", { style: "percent" })}`,
    failure: `Failed ${direction === "increase" ? "increasing" : "decreasing"} brightness of ${light.metadata.name}`,
  });
}

function handleSetColor(
  hue: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  light: Light,
  color: CssColor,
) {
  const { xy, brightness } = hexToXy(color.value);

  // Darker colors will result in a lower brightness value to better match the color.
  const changes = {
    on: { on: true },
    color: { xy: xy },
    dimming: { brightness: brightness },
  };

  return applyUpdate(hue, {
    rateLimiter,
    // Clear the color temperature like the bridge does in color mode, as getColorFromLight prefers it over color.
    lights: new Map([[light.id, { ...changes, color_temperature: { mirek: null, mirek_valid: false } }]]),
    request: (hueClient) => hueClient.updateLight(light, withTransition(changes)),
    success: `Set color of ${light.metadata.name} to ${color.name}`,
    failure: "Failed setting color",
  });
}

function handleColorTemperatureChange(
  hue: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  light: Light,
  direction: "warmer" | "cooler",
) {
  const adjustedColorTemperature = calculateAdjustedColorTemperature(getMiredFromLight(light), direction);
  const changes = {
    on: { on: true },
    // color_temperature_delta exists, but manually calculating the new value
    // enables the usage of the value in the optimistic update.
    color_temperature: { mirek: adjustedColorTemperature },
  };

  return applyUpdate(hue, {
    rateLimiter,
    lights: new Map([[light.id, changes]]),
    request: (hueClient) => hueClient.updateLight(light, withTransition(changes)),
    success: `Made ${light.metadata.name} ${direction}`,
    failure: `Failed making ${light.metadata.name} ${direction}`,
  });
}
