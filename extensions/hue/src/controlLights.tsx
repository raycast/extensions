import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import type { CssColor, Group, Light } from "./lib/types";
import { COLORS } from "./helpers/constants";
import ManageHueBridge from "./components/ManageHueBridge";
import UnlinkAction from "./components/UnlinkAction";
import BrightnessActions from "./components/BrightnessActions";
import { Hue, useHue } from "./hooks/useHue";
import { useInputRateLimiter } from "./hooks/useInputRateLimiter";
import { calculateAdjustedColorTemperature, hexToXy } from "./helpers/colors";
import { getLightsFromGroup, getMiredFromLight, isReachable } from "./helpers/hueResources";
import { byName } from "./helpers/collections";
import { applyUpdate, getIconForColor } from "./helpers/raycast";
import { createLightIcon } from "./helpers/svgImages";

export default function ControlLights() {
  const hue = useHue();
  const { hueBridgeState, send, isLoading, lights, rooms, zones } = hue;
  const canExecute = useInputRateLimiter(100);

  const groups = [...rooms, ...zones].sort(byName);

  const manageHueBridgeElement = ManageHueBridge(hueBridgeState, send);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  return (
    <Grid isLoading={isLoading} filtering={{ keepSectionOrder: true }} columns={8}>
      {groups.map((group) => (
        <Grid.Section key={group.id} title={group.metadata.name}>
          {getLightsFromGroup(lights, group)
            .sort(byName)
            .map((light) => (
              <LightItem key={light.id} light={light} group={group} hue={hue} canExecute={canExecute} />
            ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}

function LightItem(props: { light: Light; group: Group; hue: Hue; canExecute: () => boolean }) {
  return (
    <Grid.Item
      title={props.light.metadata.name}
      content={createLightIcon(props.light)}
      accessory={
        isReachable(props.light, props.hue.zigbeeConnectivity)
          ? undefined
          : { icon: Icon.WifiDisabled, tooltip: "Unreachable" }
      }
      keywords={[props.group.metadata.name]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ToggleLightAction
              light={props.light}
              onToggle={() => handleToggle(props.hue, props.canExecute, props.light)}
            />
            {props.light.dimming && (
              <BrightnessActions
                brightness={props.light.dimming.brightness}
                onSet={(brightness) => handleSetBrightness(props.hue, props.canExecute, props.light, brightness)}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            {props.light.color !== undefined && (
              <SetColorAction
                light={props.light}
                onSet={(color: CssColor) => handleSetColor(props.hue, props.canExecute, props.light, color)}
              />
            )}
            {props.light.color_temperature !== undefined && (
              <MakeWarmerAction
                light={props.light}
                onAction={() => handleColorTemperatureChange(props.hue, props.canExecute, props.light, "warmer")}
              />
            )}
            {props.light.color_temperature !== undefined && (
              <MakeCoolerAction
                light={props.light}
                onAction={() => handleColorTemperatureChange(props.hue, props.canExecute, props.light, "cooler")}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <UnlinkAction send={props.hue.send} />
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

function handleToggle(hue: Hue, canExecute: () => boolean, light: Light) {
  const changes = {
    on: { on: !light.on.on },
    ...(light.dimming ? { dimming: { brightness: light.dimming.brightness } } : {}),
  };

  return applyUpdate(hue, {
    canExecute,
    lights: new Map([[light.id, changes]]),
    request: (hueClient) => hueClient.updateLight(light, changes),
    success: `Turned ${light.on.on ? "off" : "on"} ${light.metadata.name}`,
    failure: `Failed turning ${light.on.on ? "off" : "on"} ${light.metadata.name}`,
  });
}

function handleSetBrightness(hue: Hue, canExecute: () => boolean, light: Light, brightness: number) {
  const changes = {
    on: { on: true },
    dimming: { brightness: brightness },
  };

  return applyUpdate(hue, {
    canExecute,
    lights: new Map([[light.id, changes]]),
    request: (hueClient) => hueClient.updateLight(light, changes),
    success: `Set brightness of ${light.metadata.name} to ${(brightness / 100).toLocaleString("en", { style: "percent" })}`,
    failure: `Failed setting brightness of ${light.metadata.name}`,
  });
}

export function handleSetColor(hue: Hue, canExecute: () => boolean, light: Light, color: CssColor) {
  const { xy, brightness } = hexToXy(color.value);

  // Darker colors will result in a lower brightness value to better match the color.
  const changes = {
    on: { on: true },
    color: { xy: xy },
    dimming: { brightness: brightness },
  };

  return applyUpdate(hue, {
    canExecute,
    // Clear the color temperature like the bridge does in color mode, as getColorFromLight prefers it over color.
    lights: new Map([[light.id, { ...changes, color_temperature: { mirek: null, mirek_valid: false } }]]),
    request: (hueClient) => hueClient.updateLight(light, changes),
    success: `Set color of ${light.metadata.name} to ${color.name}`,
    failure: "Failed setting color",
  });
}

function handleColorTemperatureChange(
  hue: Hue,
  canExecute: () => boolean,
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
    canExecute,
    lights: new Map([[light.id, changes]]),
    request: (hueClient) => hueClient.updateLight(light, changes),
    success: `Made ${light.metadata.name} ${direction}`,
    failure: `Failed making ${light.metadata.name} ${direction}`,
  });
}
