import { Action, ActionPanel, environment, Grid, Icon, Image, Toast } from "@raycast/api";
import "./helpers/arrayExtensions";
import type { CssColor, Group, Id, Light, PngUriLightIconSet } from "./lib/types";
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, BRIGHTNESSES, COLORS, MIRED_MAX, MIRED_MIN } from "./helpers/constants";
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
import { getLightsFromGroup } from "./helpers/hueResources";
import { getIconForColor, getTransitionTimeInMs, optimisticUpdate } from "./helpers/raycast";
import useLightIconPngUriSets from "./hooks/useLightIconUris";
import Style = Toast.Style;

export default function ControlLights() {
  const useHueObject = useHue();
  const { hueBridgeState, sendHueMessage, isLoading, lights, rooms, zones } = useHueObject;
  const rateLimiter = useInputRateLimiter(10, 1000);
  const { lightIconPngUriSets } = useLightIconPngUriSets(lights, 162, 162);

  const groups = ([] as Group[]).concat(rooms, zones).sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));

  const manageHueBridgeElement = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  return (
    <Grid isLoading={isLoading || lightIconPngUriSets === null} filtering={{ keepSectionOrder: true }} columns={8}>
      {groups.map((group: Group) => {
        return (
          <Group
            key={group.id}
            group={group}
            lights={getLightsFromGroup(lights, group).sort((a, b) => a.metadata.name.localeCompare(b.metadata.name))}
            lightIconPngUriSets={lightIconPngUriSets}
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
  lightIconPngUriSets: Map<Id, PngUriLightIconSet> | null;
  useHue: ReturnType<typeof useHue>;
  rateLimiter: ReturnType<typeof useInputRateLimiter>;
}) {
  return (
    <Grid.Section key={props.group.id} title={props.group.metadata.name}>
      {props.lights.map(
        (light: Light): React.JSX.Element => (
          <Light
            key={light.id}
            light={light}
            group={props.group}
            lightIconPngUriSet={props.lightIconPngUriSets?.get(light.id)}
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
  group?: Group;
  lightIconPngUriSet?: PngUriLightIconSet;
  useHue: ReturnType<typeof useHue>;
  rateLimiter: ReturnType<typeof useInputRateLimiter>;
}) {
  const content = props.lightIconPngUriSet
    ? ((props.light?.on?.on
        ? {
            source: props.lightIconPngUriSet?.on,
          }
        : {
            source: {
              light: props.lightIconPngUriSet?.offLight,
              dark: props.lightIconPngUriSet?.offDark,
            },
          }) as Image)
    : "";

  return (
    <Grid.Item
      title={props.light.metadata.name}
      content={content}
      keywords={[props.group?.metadata?.name ?? ""]}
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
                onSet={(percentage: number) => handleSetBrightness(props.useHue, props.light, percentage)}
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
                onSet={(color: CssColor) => handleSetColor(props.useHue, props.light, color)}
              />
            )}
            {props.light.color_temperature !== undefined && (
              <IncreaseColorTemperatureAction
                light={props.light}
                onIncrease={() =>
                  handleColorTemperatureChange(props.useHue, props.rateLimiter, props.light, "increase")
                }
              />
            )}
            {props.light.color_temperature !== undefined && (
              <DecreaseColorTemperatureAction
                light={props.light}
                onDecrease={() =>
                  handleColorTemperatureChange(props.useHue, props.rateLimiter, props.light, "decrease")
                }
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

function ToggleLightAction(props: { light: Light; onToggle?: () => void }) {
  return (
    <Action
      title={`Turn ${props.light.metadata.name} ${props.light.on?.on ? "Off" : "On"}`}
      icon={props.light.on?.on ? Icon.LightBulbOff : Icon.LightBulb}
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
      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
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
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
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
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
      icon={Icon.Minus}
      onAction={props.onDecrease}
    />
  );
}

function SetColorAction(props: { light: Light; onSet: (color: CssColor) => void }) {
  return (
    <ActionPanel.Submenu title="Set Color" icon={Icon.Swatch} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}>
      {COLORS.map((color) => (
        <Action key={color.name} title={color.name} icon={getIconForColor(color)} onAction={() => props.onSet(color)} />
      ))}
    </ActionPanel.Submenu>
  );
}

function IncreaseColorTemperatureAction(props: { light: Light; onIncrease?: () => void }) {
  if (props.light.color_temperature.mirek <= (props.light.color_temperature.mirek_schema?.mirek_minimum ?? MIRED_MIN)) {
    return null;
  }

  return (
    <Action
      title="Increase Color Temperature"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
      icon={Icon.Plus}
      onAction={props.onIncrease}
    />
  );
}

function DecreaseColorTemperatureAction(props: { light: Light; onDecrease?: () => void }) {
  if (props.light.color_temperature.mirek >= (props.light.color_temperature.mirek_schema?.mirek_maximum ?? MIRED_MAX)) {
    return null;
  }

  return (
    <Action
      title="Decrease Color Temperature"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
      icon={Icon.Minus}
      onAction={props.onDecrease}
    />
  );
}

async function handleToggle(
  { hueBridgeState, setLights }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  light: Light,
) {
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (!rateLimiter.canExecute()) return;

    const changes = {
      on: { on: !light.on.on },
      dynamics: { duration: getTransitionTimeInMs() },
      ...(light.dimming ? { dimming: { brightness: light.dimming?.brightness } } : {}),
    };

    const undoOptimisticUpdate = optimisticUpdate(light, changes, setLights);
    await hueBridgeState.context.hueClient.updateLight(light, changes).catch((error) => {
      undoOptimisticUpdate();
      throw error;
    });

    toast.style = Style.Success;
    toast.title = light.on.on ? `Turned ${light.metadata.name} off` : `Turned ${light.metadata.name} on`;
    await toast.show();
  } catch (error) {
    console.error(error);
    toast.style = Style.Failure;
    toast.title = light.on.on
      ? `Failed turning ${light.metadata.name} off`
      : `Failed turning ${light.metadata.name} on`;
    toast.message = error instanceof Error ? error.message : undefined;
    await toast.show();
  }
}

async function handleSetBrightness(
  { hueBridgeState, setLights }: ReturnType<typeof useHue>,
  light: Light,
  brightness: number,
) {
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");

    const changes = {
      on: { on: true },
      dimming: { brightness: brightness },
      dynamics: { duration: getTransitionTimeInMs() },
    };

    const undoOptimisticUpdate = optimisticUpdate(light, changes, setLights);
    await hueBridgeState.context.hueClient.updateLight(light, changes).catch((error) => {
      undoOptimisticUpdate();
      throw error;
    });

    toast.style = Style.Success;
    toast.title = `Set brightness of ${light.metadata.name} to ${(brightness / 100).toLocaleString("en", {
      style: "percent",
    })}`;
    await toast.show();
  } catch (error) {
    console.error(error);
    toast.style = Style.Failure;
    toast.title = `Failed setting brightness of ${light.metadata.name}`;
    toast.message = error instanceof Error ? error.message : undefined;
    await toast.show();
  }
}

async function handleBrightnessChange(
  { hueBridgeState, setLights }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  light: Light,
  direction: "increase" | "decrease",
) {
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (light.dimming === undefined) throw new Error("Light does not support dimming.");
    if (!rateLimiter.canExecute()) return;

    const adjustedBrightness = calculateAdjustedBrightness(light.dimming.brightness, direction);
    const changes = {
      on: { on: true },
      // dimming_delta exists, but manually calculating the new value
      // enables the usage of the value in the optimistic update.
      dimming: { brightness: adjustedBrightness },
      dynamics: { duration: getTransitionTimeInMs() },
    };

    const undoOptimisticUpdate = optimisticUpdate(light, changes, setLights);
    await hueBridgeState.context.hueClient.updateLight(light, changes).catch((error) => {
      undoOptimisticUpdate();
      throw error;
    });

    toast.style = Style.Success;
    toast.title = `${direction === "increase" ? "Increased" : "Decreased"} brightness of ${light.metadata.name} to ${(
      adjustedBrightness / 100
    ).toLocaleString("en", {
      style: "percent",
    })}`;
    await toast.show();
  } catch (error) {
    toast.style = Style.Failure;
    toast.title = `Failed ${direction === "increase" ? "increasing" : "decreasing"} brightness of ${
      light.metadata.name
    }`;
    toast.message = error instanceof Error ? error.message : undefined;
    await toast.show();
  }
}

async function handleSetColor({ hueBridgeState, setLights }: ReturnType<typeof useHue>, light: Light, color: CssColor) {
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (light.color === undefined) throw new Error("Light does not support colors.");

    const { xy, brightness } = hexToXy(color.value);

    // Darker colors will result in a lower brightness value to better match the color.
    const changes = {
      on: { on: true },
      color: { xy: xy },
      dimming: { brightness: brightness },
      dynamics: { duration: getTransitionTimeInMs() },
    };

    const undoOptimisticUpdate = optimisticUpdate(light, changes, setLights);
    await hueBridgeState.context.hueClient.updateLight(light, changes).catch((error) => {
      undoOptimisticUpdate();
      throw error;
    });

    toast.style = Style.Success;
    toast.title = `Set color of ${light.metadata.name} to ${color.name}`;
    await toast.show();
  } catch (error) {
    toast.style = Style.Failure;
    toast.title = "Failed setting color";
    toast.message = error instanceof Error ? error.message : undefined;
    await toast.show();
  }
}

async function handleColorTemperatureChange(
  { hueBridgeState, setLights }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  light: Light,
  direction: "increase" | "decrease",
) {
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (light.color_temperature === undefined) throw new Error("Light does not support color temperature.");
    if (!rateLimiter.canExecute()) return;

    const adjustedColorTemperature = calculateAdjustedColorTemperature(light.color_temperature.mirek, direction);
    const changes = {
      on: { on: true },
      // color_temperature_delta exists, but manually calculating the new value
      // enables the usage of the value in the optimistic update.
      color_temperature: { mirek: adjustedColorTemperature },
      dynamics: { duration: getTransitionTimeInMs() },
    } as Partial<Light>;

    const undoOptimisticUpdate = optimisticUpdate(light, changes, setLights);
    await hueBridgeState.context.hueClient.updateLight(light, changes).catch((error) => {
      undoOptimisticUpdate();
      throw error;
    });

    toast.style = Style.Success;
    toast.title = `${direction === "increase" ? "Increased" : "Decreased"} color temperature of ${light.metadata.name}`;
    await toast.show();
  } catch (error) {
    toast.style = Style.Failure;
    toast.title = `Failed ${direction === "increase" ? "increasing" : "decreasing"} color temperature of ${
      light.metadata.name
    }`;
    toast.message = error instanceof Error ? error.message : undefined;
    await toast.show();
  }
}
