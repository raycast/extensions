import { ActionPanel, Icon, List, Toast } from "@raycast/api";
import {
  adjustColorTemperature,
  calculateAdjustedBrightness,
  getIconForColor,
  getLightIcon,
  setLightColor,
} from "./lib/utils";
import { MutatePromise } from "@raycast/utils";
import { CssColor, Light, ResourceIdentifier, Room } from "./lib/types";
import { BRIGHTNESS_MAX, BRIGHTNESSES } from "./lib/constants";
import ManageHueBridge from "./components/ManageHueBridge";
import UnlinkAction from "./components/UnlinkAction";
import { SendHueMessage, useHue } from "./lib/useHue";
import HueClient from "./lib/HueClient";
import { COLORS } from "./lib/colors";
import Style = Toast.Style;

// TODO: Add support for grouped lights
//   Show grouped lights first and offer to 'enter' the group to see the individual lights
export default function ControlLights() {
  const { hueBridgeState, sendHueMessage, isLoading, lights, mutateLights, rooms } = useHue();

  // This element handles any scenario that involves the Bridge not being ready
  const manageHueBridgeElement: JSX.Element | null = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  // If we get here, the Bridge is ready
  const hueClient = hueBridgeState.context.hueClient;
  if (hueClient === undefined) {
    throw new Error("Hue client is undefined");
  }

  return (
    <List isLoading={isLoading}>
      {rooms.map((room: Room) => {
        const roomLights =
          lights.filter((light: Light) => {
            return room.children.map((child: ResourceIdentifier) => child.rid).includes(`${light.owner.rid}`);
          }) ?? [];

        return (
          <Group
            hueClient={hueClient}
            key={room.id}
            lights={roomLights}
            room={room}
            mutateLights={mutateLights}
            sendHueMessage={sendHueMessage}
          />
        );
      })}
    </List>
  );
}

function Group(props: {
  hueClient: HueClient;
  lights: Light[];
  room: Room;
  mutateLights: MutatePromise<Light[]>;
  sendHueMessage: SendHueMessage;
}) {
  return (
    <List.Section key={props.room.id} title={props.room.metadata.name}>
      {props.lights.map(
        (light: Light): JSX.Element => (
          <Light
            hueClient={props.hueClient}
            key={light.id}
            light={light}
            room={props.room}
            mutateLights={props.mutateLights}
            sendHueMessage={props.sendHueMessage}
          />
        )
      )}
    </List.Section>
  );
}

function Light(props: {
  hueClient: HueClient;
  light: Light;
  room?: Room;
  mutateLights: MutatePromise<Light[]>;
  sendHueMessage: SendHueMessage;
}) {
  return (
    <List.Item
      title={props.light.metadata.name}
      icon={getLightIcon(props.light)}
      // keywords={[props.group.name]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ToggleLightAction
              light={props.light}
              onToggle={() => handleToggle(props.hueClient, props.light, props.mutateLights)}
            />
            <SetBrightnessAction
              light={props.light}
              onSet={(percentage: number) =>
                handleSetBrightness(props.hueClient, props.light, props.mutateLights, percentage)
              }
            />
            <IncreaseBrightnessAction
              light={props.light}
              onIncrease={() => handleIncreaseBrightness(props.hueClient, props.light, props.mutateLights)}
            />
            <DecreaseBrightnessAction
              light={props.light}
              onDecrease={() => handleDecreaseBrightness(props.hueClient, props.light, props.mutateLights)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {/*
            {props.light.state.colormode == "xy" && (
              <SetColorAction
                light={props.light}
                onSet={(color: CssColor) => handleSetColor(hueClient, props.light, props.mutateLights, color)}
              />
            )}
            {props.light.state.colormode == "ct" && (
              <IncreaseColorTemperatureAction
                light={props.light}
                onIncrease={() => handleIncreaseColorTemperature(hueClient, props.light, props.mutateLights)}
              />
            )}
            {props.light.state.colormode == "ct" && (
              <DecreaseColorTemperatureAction
                light={props.light}
                onDecrease={() => handleDecreaseColorTemperature(hueClient, props.light, props.mutateLights)}
              />
            )}
*/}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <RefreshAction onRefresh={() => props.mutateLights()} />
            <UnlinkAction sendHueMessage={props.sendHueMessage} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ToggleLightAction({ light, onToggle }: { light: Light; onToggle?: () => void }) {
  return (
    <ActionPanel.Item
      title={light.on.on ? "Turn Off" : "Turn On"}
      icon={light.on.on ? Icon.LightBulbOff : Icon.LightBulb}
      onAction={onToggle}
    />
  );
}

function SetBrightnessAction(props: { light: Light; onSet: (percentage: number) => void }) {
  return (
    <ActionPanel.Submenu
      title="Set Brightness"
      icon={Icon.CircleProgress}
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
  return props.light.dimming?.brightness && props.light.dimming.brightness < BRIGHTNESS_MAX ? (
    <ActionPanel.Item
      title="Increase Brightness"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
      icon={Icon.Plus}
      onAction={props.onIncrease}
    />
  ) : null;
}

function DecreaseBrightnessAction(props: { light: Light; onDecrease: () => void }) {
  return props.light.dimming !== undefined &&
    props.light.dimming.brightness > (props.light.dimming.min_dim_level ?? 0) ? (
    <ActionPanel.Item
      title="Decrease Brightness"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
      icon={Icon.Minus}
      onAction={props.onDecrease}
    />
  ) : null;
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
  return props.light.color_temperature.mirek > props.light.color_temperature.mirek_schema.mirek_minimum ? (
    <ActionPanel.Item
      title="Increase Color Temperature"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
      icon={Icon.Plus}
      onAction={props.onIncrease}
    />
  ) : null;
}

function DecreaseColorTemperatureAction(props: { light: Light; onDecrease?: () => void }) {
  return props.light.color_temperature.mirek < props.light.color_temperature.mirek_schema.mirek_maximum ? (
    <ActionPanel.Item
      title="Decrease Color Temperature"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
      icon={Icon.Minus}
      onAction={props.onDecrease}
    />
  ) : null;
}

function RefreshAction(props: { onRefresh: () => void }) {
  return (
    <ActionPanel.Item
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={props.onRefresh}
    />
  );
}

async function handleToggle(hueClient: HueClient, light: Light, mutateLights: MutatePromise<Light[]>) {
  const toast = new Toast({ title: "" });

  try {
    await mutateLights(hueClient.toggleLight(light), {
      optimisticUpdate: (lights) => lights.update(light, { on: { on: !light.on.on } }),
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
  hueClient: HueClient,
  light: Light,
  mutateLights: MutatePromise<Light[]>,
  percentage: number
) {
  const toast = new Toast({ title: "" });

  try {
    hueClient.setBrightness(light, percentage).then(() => mutateLights());
    await mutateLights(hueClient.setBrightness(light, percentage), {
      optimisticUpdate: (lights) =>
        lights.update(light, {
          on: { on: true },
          dimming: { brightness: percentage },
        }),
    });

    toast.style = Style.Success;
    toast.title = `Set brightness of ${light.metadata.name} to ${(percentage / 100).toLocaleString("en", {
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

async function handleIncreaseBrightness(hueClient: HueClient, light: Light, mutateLights: MutatePromise<Light[]>) {
  const toast = new Toast({ title: "" });
  const newBrightness = calculateAdjustedBrightness(light, "increase");

  try {
    await mutateLights(hueClient.setBrightness(light, newBrightness), {
      optimisticUpdate: (lights) =>
        lights.update(light, {
          on: { on: true },
          dimming: { brightness: newBrightness },
        }),
    });

    toast.style = Style.Success;
    toast.title = `Increased brightness of ${light.metadata.name}`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = `Failed increasing brightness of ${light.metadata.name}`;
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleDecreaseBrightness(hueClient: HueClient, light: Light, mutateLights: MutatePromise<Light[]>) {
  const toast = new Toast({ title: "" });
  const newBrightness = calculateAdjustedBrightness(light, "decrease");

  try {
    await mutateLights(hueClient.setBrightness(light, newBrightness), {
      optimisticUpdate: (lights) => lights.update(light, { dimming: { brightness: newBrightness } }),
    });

    toast.style = Style.Success;
    toast.title = `Decreased brightness of ${light.metadata.name}`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = `Failed decreasing brightness of ${light.metadata.name}`;
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleSetColor(
  hueClient: HueClient,
  light: Light,
  mutateLights: MutatePromise<Light[]>,
  color: CssColor
) {
  const toast = new Toast({ title: "" });

  try {
    await mutateLights(setLightColor(api, light, color.value), {
      // optimisticUpdate(lights) {
      //   return lights.map((it) =>
      //     it.id === light.id ? { ...it, state: { ...it.state, on: true, xy: hexToXy(color.value) } } : it
      //   );
      // },
    });

    toast.style = Style.Success;
    toast.title = `Set color to ${color.name}`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed setting color";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleIncreaseColorTemperature(
  hueClient: HueClient,
  light: Light,
  mutateLights: MutatePromise<Light[]>
) {
  const toast = new Toast({ title: "" });

  try {
    await mutateLights(adjustColorTemperature(api, light, "increase"), {
      // optimisticUpdate(lights) {
      //   return lights?.map((it) =>
      //     it.id === light.id
      //       ? { ...it, state: { ...it.state, ct: calculateAdjustedColorTemperature(light, "increase") } }
      //       : it
      //   );
      // },
    });

    toast.style = Style.Success;
    toast.title = "Increased color temperature";
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed increasing color temperature";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleDecreaseColorTemperature(
  hueClient: HueClient,
  light: Light,
  mutateLights: MutatePromise<Light[]>
) {
  const toast = new Toast({ title: "" });

  try {
    await mutateLights(adjustColorTemperature(api, light, "decrease"), {
      // optimisticUpdate(lights) {
      //   return lights.map((it) =>
      //     it.id === light.id
      //       ? { ...it, state: { ...it.state, ct: calculateAdjustedColorTemperature(light, "decrease") } }
      //       : it
      //   );
      // },
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
