import { ActionPanel, Color, Icon, List, Toast } from "@raycast/api";
import {
  calculateAdjustedBrightness,
  calculateAdjustedColorTemperature,
  getClosestBrightness,
  getIconForColor,
  getLightIcon,
} from "./lib/utils";
import { CssColor, Group, Light } from "./lib/types";
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, BRIGHTNESSES, MIREK_MAX, MIREK_MIN } from "./lib/constants";
import ManageHueBridge from "./components/ManageHueBridge";
import UnlinkAction from "./components/UnlinkAction";
import { SendHueMessage, useHue } from "./hooks/useHue";
import HueClient from "./lib/HueClient";
import { COLORS, hexToXy } from "./lib/colors";
import React from "react";
import { getProgressIcon } from "@raycast/utils";
import useInputRateLimiter from "./hooks/useInputRateLimiter";
import Style = Toast.Style;

// TODO: Add support for grouped lights
//   Show grouped lights first and offer to 'enter' the group to see the individual lights
export default function ControlLights() {
  const { hueBridgeState, sendHueMessage, isLoading, lights, rooms, zones } = useHue();
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
          <Group
            hueClient={hueBridgeState.context.hueClient}
            key={group.id}
            lights={roomLights}
            group={group}
            sendHueMessage={sendHueMessage}
            rateLimiter={rateLimiter}
          />
        );
      })}
    </List>
  );
}

function Group(props: {
  hueClient?: HueClient;
  lights: Light[];
  group: Group;
  sendHueMessage: SendHueMessage;
  rateLimiter: ReturnType<typeof useInputRateLimiter>;
}) {
  return (
    <List.Section key={props.group.id} title={props.group.metadata.name}>
      {props.lights.map(
        (light: Light): JSX.Element => (
          <Light
            hueClient={props.hueClient}
            key={light.id}
            light={light}
            group={props.group}
            sendHueMessage={props.sendHueMessage}
            rateLimiter={props.rateLimiter}
          />
        )
      )}
    </List.Section>
  );
}

function Light(props: {
  hueClient?: HueClient;
  light: Light;
  group?: Group;
  sendHueMessage: SendHueMessage;
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
            <ToggleLightAction light={props.light} onToggle={() => handleToggle(props.hueClient, props.light)} />
            <SetBrightnessAction
              light={props.light}
              onSet={(percentage: number) => handleSetBrightness(props.hueClient, props.light, percentage)}
            />
            <IncreaseBrightnessAction
              light={props.light}
              onIncrease={() => handleIncreaseBrightness(props.hueClient, props.rateLimiter, props.light)}
            />
            <DecreaseBrightnessAction
              light={props.light}
              onDecrease={() => handleDecreaseBrightness(props.hueClient, props.rateLimiter, props.light)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {props.light.color !== undefined && (
              <SetColorAction
                light={props.light}
                onSet={(color: CssColor) => handleSetColor(props.hueClient, props.light, color)}
              />
            )}
            {props.light.color_temperature !== undefined && (
              <IncreaseColorTemperatureAction
                light={props.light}
                onIncrease={() => handleIncreaseColorTemperature(props.hueClient, props.rateLimiter, props.light)}
              />
            )}
            {props.light.color_temperature !== undefined && (
              <DecreaseColorTemperatureAction
                light={props.light}
                onDecrease={() => handleDecreaseColorTemperature(props.hueClient, props.rateLimiter, props.light)}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <UnlinkAction sendHueMessage={props.sendHueMessage} />
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
  if (props.light.color_temperature.mirek <= (props.light.color_temperature.mirek_schema?.mirek_minimum ?? MIREK_MIN)) {
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
  if (props.light.color_temperature.mirek >= (props.light.color_temperature.mirek_schema?.mirek_maximum ?? MIREK_MAX)) {
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

async function handleToggle(hueClient: HueClient | undefined, light: Light) {
  const toast = new Toast({ title: "" });

  try {
    if (hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    await hueClient.updateLight(light, {
      on: { on: !light.on.on },
      // TODO: Figure out why transition time causes the light to turn on at 1% brightness
      // dynamics: { duration: getTransitionTimeInMs() },
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

async function handleSetBrightness(hueClient: HueClient | undefined, light: Light, brightness: number) {
  const toast = new Toast({ title: "" });

  try {
    if (hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    await hueClient.updateLight(light, {
      // TODO: Why not just use light.on.on here?
      ...(light.on.on ? {} : { on: { on: true } }),
      dimming: { brightness: brightness },
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

async function handleIncreaseBrightness(
  hueClient: HueClient | undefined,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  light: Light
) {
  const { canExecute } = rateLimiter;
  const toast = new Toast({ title: "" });

  try {
    if (hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (light.dimming === undefined) throw new Error("Light does not support dimming.");
    if (!canExecute()) return;

    const adjustedBrightness = calculateAdjustedBrightness(light.dimming.brightness, "increase");

    await hueClient.updateLight(light, {
      ...(light.on.on ? {} : { on: { on: true } }),
      dimming: { brightness: adjustedBrightness },
    });

    toast.style = Style.Success;
    toast.title = `Increased brightness of ${light.metadata.name} to ${(adjustedBrightness / 100).toLocaleString("en", {
      style: "percent",
    })}`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = `Failed increasing brightness of ${light.metadata.name}`;
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleDecreaseBrightness(
  hueClient: HueClient | undefined,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  light: Light
) {
  const { canExecute } = rateLimiter;
  const toast = new Toast({ title: "" });

  try {
    if (hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (light.dimming === undefined) throw new Error("Light does not support dimming.");
    if (!canExecute()) return;

    const adjustedBrightness = calculateAdjustedBrightness(light.dimming.brightness, "decrease");

    await hueClient.updateLight(light, {
      ...(light.on.on ? {} : { on: { on: true } }),
      dimming: { brightness: adjustedBrightness },
    });

    toast.style = Style.Success;
    toast.title = `Decreased brightness of ${light.metadata.name} to ${(adjustedBrightness / 100).toLocaleString("en", {
      style: "percent",
    })}`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = `Failed decreasing brightness of ${light.metadata.name}`;
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleSetColor(hueClient: HueClient | undefined, light: Light, color: CssColor) {
  const toast = new Toast({ title: "" });

  try {
    if (hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (light.color === undefined) throw new Error("Light does not support colors.");

    await hueClient.updateLight(light, {
      on: { on: true },
      color: { xy: hexToXy(color.value) },
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

async function handleIncreaseColorTemperature(
  hueClient: HueClient | undefined,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  light: Light
) {
  const { canExecute } = rateLimiter;
  const toast = new Toast({ title: "" });

  try {
    if (hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (light.color_temperature === undefined) throw new Error("Light does not support color temperature.");
    if (!canExecute()) return;

    const adjustedColorTemperature = calculateAdjustedColorTemperature(light.color_temperature.mirek, "increase");

    await hueClient.updateLight(light, {
      on: { on: true },
      color_temperature: { mirek: adjustedColorTemperature },
    });

    toast.style = Style.Success;
    toast.title = `Increased color temperature of ${light.metadata.name}`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = `Failed increasing color temperature of ${light.metadata.name}`;
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleDecreaseColorTemperature(
  hueClient: HueClient | undefined,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  light: Light
) {
  const { canExecute } = rateLimiter;

  const toast = new Toast({ title: "" });

  try {
    if (hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (light.color_temperature === undefined) throw new Error("Light does not support color temperature.");
    if (!canExecute()) return;

    const adjustedColorTemperature = calculateAdjustedColorTemperature(light.color_temperature.mirek, "decrease");

    canExecute();
    await hueClient.updateLight(light, {
      on: { on: true },
      color_temperature: { mirek: adjustedColorTemperature },
    });

    toast.style = Style.Success;
    toast.title = "Decreased color temperature";
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed decreasing color temperature";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}
