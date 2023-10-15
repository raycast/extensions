import { ActionPanel, Icon, List, Toast } from "@raycast/api";
import { hexToXy } from "./lib/colors";
import {
  adjustBrightness,
  adjustColorTemperature,
  calculateAdjustedBrightness,
  calculateAdjustedColorTemperature,
  SendHueMessage,
  setLightBrightness,
  setLightColor,
  toggleLight,
  useHue,
} from "./lib/hue";
import { getIconForColor, getLightIcon } from "./lib/utils";
import { MutatePromise } from "@raycast/utils";
import { CssColor, Group, Light } from "./lib/types";
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, BRIGHTNESSES, COLOR_TEMP_MAX, COLOR_TEMP_MIN, COLORS } from "./lib/constants";
import ManageHueBridge from "./components/ManageHueBridge";
import UnlinkAction from "./components/UnlinkAction";
import Style = Toast.Style;

export default function ControlLights() {
  const { hueBridgeState, sendHueMessage, isLoading, lights, mutateLights, groups } = useHue();

  const manageHueBridgeElement: JSX.Element | null = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  const rooms = groups.filter((group: Group) => group.type === "Room") as Group[];
  const entertainmentAreas = groups.filter((group: Group) => group.type === "Entertainment") as Group[];
  const zones = groups.filter((group: Group) => group.type === "Zone") as Group[];
  const groupTypes = Array.of(rooms, entertainmentAreas, zones);

  return (
    <List isLoading={isLoading}>
      {groupTypes.map((groupType: Group[]): JSX.Element[] => {
        return groupType.map((group: Group) => {
          const groupLights =
            lights.filter((light: Light) => {
              return group.lights.includes(`${light.id}`);
            }) ?? [];

          return (
            <Group
              key={group.id}
              lights={groupLights}
              group={group}
              mutateLights={mutateLights}
              sendHueMessage={sendHueMessage}
            />
          );
        });
      })}
    </List>
  );
}

function Group(props: {
  lights: Light[];
  group: Group;
  mutateLights: MutatePromise<Light[]>;
  sendHueMessage: SendHueMessage;
}) {
  return (
    <List.Section key={props.group.id} title={props.group.name} subtitle={props.group.type}>
      {props.lights.map(
        (light: Light): JSX.Element => (
          <Light
            key={light.id}
            light={light}
            group={props.group}
            mutateLights={props.mutateLights}
            sendHueMessage={props.sendHueMessage}
          />
        )
      )}
    </List.Section>
  );
}

function Light(props: {
  light: Light;
  group: Group;
  mutateLights: MutatePromise<Light[]>;
  sendHueMessage: SendHueMessage;
}) {
  return (
    <List.Item
      title={props.light.name}
      icon={getLightIcon(props.light.state)}
      keywords={[props.group.name]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ToggleLightAction light={props.light} onToggle={() => handleToggle(props.light, props.mutateLights)} />
            <SetBrightnessAction
              light={props.light}
              onSet={(percentage: number) => handleSetBrightness(props.light, props.mutateLights, percentage)}
            />
            <IncreaseBrightnessAction
              light={props.light}
              onIncrease={() => handleIncreaseBrightness(props.light, props.mutateLights)}
            />
            <DecreaseBrightnessAction
              light={props.light}
              onDecrease={() => handleDecreaseBrightness(props.light, props.mutateLights)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {props.light.state.colormode == "xy" && (
              <SetColorAction
                light={props.light}
                onSet={(color: CssColor) => handleSetColor(props.light, props.mutateLights, color)}
              />
            )}
            {props.light.state.colormode == "ct" && (
              <IncreaseColorTemperatureAction
                light={props.light}
                onIncrease={() => handleIncreaseColorTemperature(props.light, props.mutateLights)}
              />
            )}
            {props.light.state.colormode == "ct" && (
              <DecreaseColorTemperatureAction
                light={props.light}
                onDecrease={() => handleDecreaseColorTemperature(props.light, props.mutateLights)}
              />
            )}
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
      title={light.state.on ? "Turn Off" : "Turn On"}
      icon={light.state.on ? Icon.LightBulbOff : Icon.LightBulb}
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

function IncreaseBrightnessAction(props: { light: Light; onIncrease?: () => void }) {
  return props.light.state.bri < BRIGHTNESS_MAX ? (
    <ActionPanel.Item
      title="Increase Brightness"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
      icon={Icon.Plus}
      onAction={props.onIncrease}
    />
  ) : null;
}

function DecreaseBrightnessAction(props: { light: Light; onDecrease?: () => void }) {
  return props.light.state.bri > BRIGHTNESS_MIN ? (
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
  return props.light.state.bri > COLOR_TEMP_MIN ? (
    <ActionPanel.Item
      title="Increase Color Temperature"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
      icon={Icon.Plus}
      onAction={props.onIncrease}
    />
  ) : null;
}

function DecreaseColorTemperatureAction(props: { light: Light; onDecrease?: () => void }) {
  return props.light.state.bri < COLOR_TEMP_MAX ? (
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

async function handleToggle(light: Light, mutateLights: MutatePromise<Light[]>) {
  const toast = new Toast({ title: "" });

  try {
    await mutateLights(toggleLight(light), {
      optimisticUpdate(lights) {
        return lights?.map((it) => (it.id === light.id ? { ...it, state: { ...it.state, on: !light.state.on } } : it));
      },
    });

    toast.style = Style.Success;
    toast.title = light.state.on ? "Turned light off" : "Turned light on";
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = light.state.on ? "Failed turning light off" : "Failed turning light on";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleSetBrightness(light: Light, mutateLights: MutatePromise<Light[]>, percentage: number) {
  const toast = new Toast({ title: "" });
  const brightness = (percentage / 100) * 253 + 1;

  try {
    await mutateLights(setLightBrightness(light, brightness), {
      optimisticUpdate(lights) {
        return lights.map((it) =>
          it.id === light.id ? { ...it, state: { ...it.state, on: true, bri: brightness } } : it
        );
      },
    });

    toast.style = Style.Success;
    toast.title = `Set brightness to ${(percentage / 100).toLocaleString("en", { style: "percent" })}`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed setting brightness";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleIncreaseBrightness(light: Light, mutateLights: MutatePromise<Light[]>) {
  const toast = new Toast({ title: "" });

  try {
    await mutateLights(adjustBrightness(light, "increase"), {
      optimisticUpdate(lights) {
        return lights?.map((it) =>
          it.id === light.id
            ? { ...it, state: { ...it.state, on: true, bri: calculateAdjustedBrightness(light, "increase") } }
            : it
        );
      },
    });

    toast.style = Style.Success;
    toast.title = "Increased brightness";
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed increasing brightness";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleDecreaseBrightness(light: Light, mutateLights: MutatePromise<Light[]>) {
  const toast = new Toast({ title: "" });

  try {
    await mutateLights(adjustBrightness(light, "decrease"), {
      optimisticUpdate(lights) {
        return lights.map((it) =>
          it.id === light.id
            ? { ...it, state: { ...it.state, on: true, bri: calculateAdjustedBrightness(light, "decrease") } }
            : it
        );
      },
    });

    toast.style = Style.Success;
    toast.title = "Decreased brightness";
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed decreasing brightness";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleSetColor(light: Light, mutateLights: MutatePromise<Light[]>, color: CssColor) {
  const toast = new Toast({ title: "" });

  try {
    await mutateLights(setLightColor(light, color.value), {
      optimisticUpdate(lights) {
        return lights.map((it) =>
          it.id === light.id ? { ...it, state: { ...it.state, on: true, xy: hexToXy(color.value) } } : it
        );
      },
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

async function handleIncreaseColorTemperature(light: Light, mutateLights: MutatePromise<Light[]>) {
  const toast = new Toast({ title: "" });

  try {
    await mutateLights(adjustColorTemperature(light, "increase"), {
      optimisticUpdate(lights) {
        return lights?.map((it) =>
          it.id === light.id
            ? { ...it, state: { ...it.state, ct: calculateAdjustedColorTemperature(light, "increase") } }
            : it
        );
      },
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

async function handleDecreaseColorTemperature(light: Light, mutateLights: MutatePromise<Light[]>) {
  const toast = new Toast({ title: "" });

  try {
    await mutateLights(adjustColorTemperature(light, "decrease"), {
      optimisticUpdate(lights) {
        return lights.map((it) =>
          it.id === light.id
            ? { ...it, state: { ...it.state, ct: calculateAdjustedColorTemperature(light, "decrease") } }
            : it
        );
      },
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
