import { ActionPanel, Color, Icon, List, Toast } from "@raycast/api";
import {
  calculateAdjustedBrightness,
  calculateAdjustedColorTemperature,
  getClosestBrightness,
  getIconForColor,
  getLightIcon,
  optimisticUpdate,
} from "./lib/utils";
import "./lib/arrayExtensions";
import { CssColor, Group, Light } from "./lib/types";
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, BRIGHTNESSES, COLORS, MIRED_MAX, MIRED_MIN } from "./lib/constants";
import ManageHueBridge from "./components/ManageHueBridge";
import UnlinkAction from "./components/UnlinkAction";
import { useHue } from "./hooks/useHue";
import React from "react";
import { getProgressIcon } from "@raycast/utils";
import useInputRateLimiter from "./hooks/useInputRateLimiter";
import { hexToXy } from "./lib/colors";
import Style = Toast.Style;

export default function ControlLights() {
  const useHueObject = useHue();
  const { hueBridgeState, sendHueMessage, isLoading, lights, rooms, zones } = useHueObject;
  const rateLimiter = useInputRateLimiter(10, 1000);

  const groups = ([] as Group[]).concat(rooms, zones);

  const manageHueBridgeElement = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  return (
    <List isLoading={isLoading}>
      {groups.map((group: Group) => {
        const roomLights = lights.filter((light: Light) =>
          group.children.some((child) => [light.id, light.owner.rid].includes(child.rid))
        );

        return (
          <Group key={group.id} group={group} lights={roomLights} useHue={useHueObject} rateLimiter={rateLimiter} />
        );
      })}
    </List>
  );
}

function Group(props: {
  group: Group;
  lights: Light[];
  useHue: ReturnType<typeof useHue>;
  rateLimiter: ReturnType<typeof useInputRateLimiter>;
}) {
  return (
    <List.Section key={props.group.id} title={props.group.metadata.name}>
      {props.lights.map(
        (light: Light): JSX.Element => (
          <Light
            key={light.id}
            light={light}
            group={props.group}
            useHue={props.useHue}
            rateLimiter={props.rateLimiter}
          />
        )
      )}
    </List.Section>
  );
}

function Light(props: {
  light: Light;
  group?: Group;
  useHue: ReturnType<typeof useHue>;
  rateLimiter: ReturnType<typeof useInputRateLimiter>;
}) {
  return (
    <List.Item
      title={props.light.metadata.name}
      icon={getLightIcon(props.light)}
      keywords={[props.group?.metadata?.name ?? ""]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ToggleLightAction
              light={props.light}
              onToggle={() => handleToggle(props.useHue, props.rateLimiter, props.light)}
            />
            <SetBrightnessAction
              light={props.light}
              onSet={(percentage: number) => handleSetBrightness(props.useHue, props.light, percentage)}
            />
            <IncreaseBrightnessAction
              light={props.light}
              onIncrease={() => handleBrightnessChange(props.useHue, props.rateLimiter, props.light, "increase")}
            />
            <DecreaseBrightnessAction
              light={props.light}
              onDecrease={() => handleBrightnessChange(props.useHue, props.rateLimiter, props.light, "decrease")}
            />
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
    <ActionPanel.Item
      title={`Turn ${props.light.metadata.name} ${props.light.on?.on ? "Off" : "On"}`}
      icon={props.light.on?.on ? Icon.LightBulbOff : Icon.LightBulb}
      onAction={props.onToggle}
    />
  );
}

function SetBrightnessAction(props: { light: Light; onSet: (percentage: number) => void }) {
  // TODO: Figure out why Color.PrimaryText is black instead of white in dark mode
  return (
    <ActionPanel.Submenu
      title="Set Brightness"
      icon={getProgressIcon((props.light.dimming?.brightness ?? 0) / 100, Color.PrimaryText)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
    >
      {BRIGHTNESSES.map((brightness) => (
        <ActionPanel.Item
          key={brightness}
          title={`${brightness}% Brightness`}
          onAction={() => props.onSet(brightness)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function IncreaseBrightnessAction(props: { light: Light; onIncrease: () => void }) {
  if (props.light.dimming === undefined || getClosestBrightness(props.light.dimming.brightness) >= BRIGHTNESS_MAX) {
    return null;
  }

  return (
    <ActionPanel.Item
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
    <ActionPanel.Item
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
        <ActionPanel.Item
          key={color.name}
          title={color.name}
          icon={getIconForColor(color)}
          onAction={() => props.onSet(color)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function IncreaseColorTemperatureAction(props: { light: Light; onIncrease?: () => void }) {
  if (props.light.color_temperature.mirek <= (props.light.color_temperature.mirek_schema?.mirek_minimum ?? MIRED_MIN)) {
    return null;
  }

  return (
    <ActionPanel.Item
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
    <ActionPanel.Item
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
  light: Light
) {
  const { canExecute } = rateLimiter;
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (!canExecute()) return;

    const changes = {
      on: {
        on: !light.on.on,
        // TODO: Figure out why transition time causes the light to turn on at 1% brightness
        // dynamics: { duration: getTransitionTimeInMs() },
      },
    };

    const undoOptimisticUpdate = optimisticUpdate(light, changes, setLights);
    await hueBridgeState.context.hueClient.updateLight(light, changes).catch((e) => {
      undoOptimisticUpdate();
      throw e;
    });

    toast.style = Style.Success;
    toast.title = light.on.on ? `Turned ${light.metadata.name} off` : `Turned ${light.metadata.name} on`;
    await toast.show();
  } catch (e) {
    console.error(e);
    toast.style = Style.Failure;
    toast.title = light.on.on
      ? `Failed turning ${light.metadata.name} off`
      : `Failed turning ${light.metadata.name} on`;
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleSetBrightness(
  { hueBridgeState, setLights }: ReturnType<typeof useHue>,
  light: Light,
  brightness: number
) {
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");

    const changes = {
      on: { on: true },
      dimming: { brightness: brightness },
    };

    const undoOptimisticUpdate = optimisticUpdate(light, changes, setLights);
    await hueBridgeState.context.hueClient.updateLight(light, changes).catch((e) => {
      undoOptimisticUpdate();
      throw e;
    });

    toast.style = Style.Success;
    toast.title = `Set brightness of ${light.metadata.name} to ${(brightness / 100).toLocaleString("en", {
      style: "percent",
    })}`;
    await toast.show();
  } catch (e) {
    console.error(e);
    toast.style = Style.Failure;
    toast.title = `Failed setting brightness of ${light.metadata.name}`;
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleBrightnessChange(
  { hueBridgeState, setLights }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  light: Light,
  direction: "increase" | "decrease"
) {
  const { canExecute } = rateLimiter;
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (light.dimming === undefined) throw new Error("Light does not support dimming.");
    if (!canExecute()) return;

    const adjustedBrightness = calculateAdjustedBrightness(light.dimming.brightness, direction);
    const changes = {
      on: { on: true },
      // dimming_delta exists, but manually calculating the new value
      // enables the usage of the value in the optimistic update.
      dimming: { brightness: adjustedBrightness },
    };

    const undoOptimisticUpdate = optimisticUpdate(light, changes, setLights);
    await hueBridgeState.context.hueClient.updateLight(light, changes).catch((e) => {
      undoOptimisticUpdate();
      throw e;
    });

    toast.style = Style.Success;
    toast.title = `${direction === "increase" ? "Increased" : "Decreased"} brightness of ${light.metadata.name} to ${(
      adjustedBrightness / 100
    ).toLocaleString("en", {
      style: "percent",
    })}`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = `Failed ${direction === "increase" ? "increasing" : "decreasing"} brightness of ${
      light.metadata.name
    }`;
    toast.message = e instanceof Error ? e.message : undefined;
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
    };

    const undoOptimisticUpdate = optimisticUpdate(light, changes, setLights);
    await hueBridgeState.context.hueClient.updateLight(light, changes).catch((e) => {
      undoOptimisticUpdate();
      throw e;
    });

    toast.style = Style.Success;
    toast.title = `Set color of ${light.metadata.name} to ${color.name}`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed setting color";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleColorTemperatureChange(
  { hueBridgeState, setLights }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  light: Light,
  direction: "increase" | "decrease"
) {
  const { canExecute } = rateLimiter;

  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (light.color_temperature === undefined) throw new Error("Light does not support color temperature.");
    if (!canExecute()) return;

    const adjustedColorTemperature = calculateAdjustedColorTemperature(light.color_temperature.mirek, direction);
    const changes = {
      on: { on: true },
      // color_temperature_delta exists, but manually calculating the new value
      // enables the usage of the value in the optimistic update.
      color_temperature: { mirek: adjustedColorTemperature },
    };

    const undoOptimisticUpdate = optimisticUpdate(light, changes, setLights);
    await hueBridgeState.context.hueClient.updateLight(light, changes).catch((e) => {
      undoOptimisticUpdate();
      throw e;
    });

    toast.style = Style.Success;
    toast.title = `${direction === "increase" ? "Increased" : "Decreased"} color temperature of ${light.metadata.name}`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = `Failed ${direction === "increase" ? "increasing" : "decreasing"} color temperature of ${
      light.metadata.name
    }`;
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}
