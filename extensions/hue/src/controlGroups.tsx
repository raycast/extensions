import { ActionPanel, Color, Grid, Icon, Image, Toast, useNavigation } from "@raycast/api";
import {
  calculateAdjustedBrightness,
  getClosestBrightness,
  getColorFromLight,
  getLightsFromGroup,
  getTransitionTimeInMs,
  optimisticUpdate,
  optimisticUpdates,
} from "./lib/utils";
import { Group, GroupedLight, Id, Light, Palette, Room, Zone } from "./lib/types";
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, BRIGHTNESSES } from "./lib/constants";
import ManageHueBridge from "./components/ManageHueBridge";
import { useHue } from "./hooks/useHue";
import { getProgressIcon } from "@raycast/utils";
import { useMemo, useState } from "react";
import useGradientUris from "./hooks/useGradientUris";
import "./lib/arrayExtensions";
import useInputRateLimiter from "./hooks/useInputRateLimiter";
import UnlinkAction from "./components/UnlinkAction";
import SetScene from "./setScene";
import Style = Toast.Style;

// Exact dimensions of a 16:9 Raycast 5 column grid item.
const GRID_ITEM_WIDTH = 271;
const GRID_ITEM_HEIGHT = 153;

export default function ControlGroups() {
  const useHueObject = useHue();
  const { hueBridgeState, sendHueMessage, isLoading, lights, groupedLights, rooms, zones } = useHueObject;
  const rateLimiter = useInputRateLimiter(10, 1000);
  const [palettes, setPalettes] = useState(new Map<Id, Palette>([]));
  const { gradientUris } = useGradientUris(palettes, GRID_ITEM_WIDTH, GRID_ITEM_HEIGHT);

  useMemo(() => {
    const groups = [...rooms, ...zones];
    const palettes = new Map<Id, Palette>(
      groups.map((group) => [group.id, getLightsFromGroup(lights, group).map((light) => getColorFromLight(light))])
    );

    setPalettes(palettes);
  }, [rooms, zones, lights]);

  const manageHueBridgeElement: JSX.Element | null = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  return (
    <Grid isLoading={isLoading} aspectRatio="16/9" fit={Grid.Fit.Fill}>
      {rooms.length > 0 && (
        <Grid.Section title="Rooms">
          {rooms.map((room: Room) => {
            const groupLights = getLightsFromGroup(lights, room);
            const groupedLight = groupedLights.find(
              (groupedLight) =>
                groupedLight.id === room.services.find((resource) => resource.rtype === "grouped_light")?.rid
            );

            return (
              <Group
                key={room.id}
                groupLights={groupLights}
                groupedLight={groupedLight}
                group={room}
                gradientUri={gradientUris.get(room.id)}
                useHue={useHueObject}
                rateLimiter={rateLimiter}
              />
            );
          })}
        </Grid.Section>
      )}
      {zones.length > 0 && (
        <Grid.Section title="Zones">
          {zones.map((zone: Zone) => {
            const groupLights = getLightsFromGroup(lights, zone);
            const groupedLight = groupedLights.find(
              (groupedLight) =>
                groupedLight.id === zone.services.find((resource) => resource.rtype === "grouped_light")?.rid
            );

            return (
              <Group
                key={zone.id}
                group={zone}
                groupLights={groupLights}
                groupedLight={groupedLight}
                gradientUri={gradientUris.get(zone.id)}
                useHue={useHueObject}
                rateLimiter={rateLimiter}
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}

function Group(props: {
  groupLights: Light[];
  groupedLight?: GroupedLight;
  group: Group;
  gradientUri?: string;
  useHue: ReturnType<typeof useHue>;
  rateLimiter: ReturnType<typeof useInputRateLimiter>;
}) {
  const lightsOnCount = props.groupLights.filter((light) => light.on.on).length;
  let lightStatusText;
  if (lightsOnCount === 0) {
    lightStatusText = "All lights are off";
  } else if (lightsOnCount === props.groupLights.length) {
    lightStatusText = "All lights are on";
  } else if (lightsOnCount === 1) {
    lightStatusText = "1 light is on";
  } else {
    lightStatusText = `${lightsOnCount} lights are on`;
  }

  const content = props.groupedLight?.on?.on
    ? props.gradientUri ?? ""
    : ({
        source: {
          light: "group-off.png",
          dark: "group-off@dark.png",
        },
      } as Image);

  return (
    <Grid.Item
      key={props.group.id}
      title={props.group.metadata.name}
      subtitle={lightStatusText}
      content={content}
      actions={
        props.groupedLight && (
          <ActionPanel>
            <ToggleGroupAction
              group={props.group}
              groupedLight={props.groupedLight}
              onToggle={() =>
                handleToggle(props.useHue, props.rateLimiter, props.groupLights, props.groupedLight, props.group)
              }
            />
            <SetSceneAction group={props.group} useHue={props.useHue} />
            <ActionPanel.Section>
              <SetBrightnessAction
                group={props.group}
                groupedLight={props.groupedLight}
                onSet={(brightness: number) =>
                  handleSetBrightness(
                    props.useHue,
                    props.rateLimiter,
                    props.groupLights,
                    props.groupedLight,
                    props.group,
                    brightness
                  )
                }
              />
              <IncreaseBrightnessAction
                group={props.group}
                groupedLight={props.groupedLight}
                onIncrease={() =>
                  handleBrightnessChange(
                    props.useHue,
                    props.rateLimiter,
                    props.groupLights,
                    props.groupedLight,
                    props.group,
                    "increase"
                  )
                }
              />
              <DecreaseBrightnessAction
                group={props.group}
                groupedLight={props.groupedLight}
                onDecrease={() =>
                  handleBrightnessChange(
                    props.useHue,
                    props.rateLimiter,
                    props.groupLights,
                    props.groupedLight,
                    props.group,
                    "decrease"
                  )
                }
              />
            </ActionPanel.Section>

            <ActionPanel.Section>
              <UnlinkAction sendHueMessage={props.useHue.sendHueMessage} />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}

function ToggleGroupAction(props: { group: Group; groupedLight: GroupedLight; onToggle: () => void }) {
  return (
    <ActionPanel.Item
      title={`Turn ${props.group.metadata.name} ${props.groupedLight.on?.on ? "Off" : "On"}`}
      icon={props.groupedLight.on?.on ? Icon.LightBulbOff : Icon.LightBulb}
      onAction={props.onToggle}
    />
  );
}

function SetSceneAction(props: { group: Group; useHue: ReturnType<typeof useHue> }) {
  const { push } = useNavigation();

  return (
    <ActionPanel.Item
      title="Set Scene"
      icon={Icon.Image}
      onAction={() => push(<SetScene group={props.group} useHue={props.useHue} />)}
    />
  );
}

function SetBrightnessAction(props: { group: Group; groupedLight: GroupedLight; onSet: (brightness: number) => void }) {
  return (
    <ActionPanel.Submenu
      title="Set Brightness"
      // This should be 0-100, but the API returns 0-254
      icon={getProgressIcon((props.groupedLight.dimming?.brightness ?? 0) / 254, Color.PrimaryText)}
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

function IncreaseBrightnessAction(props: { group: Group; groupedLight: GroupedLight; onIncrease: () => void }) {
  if (
    props.groupedLight.dimming === undefined ||
    getClosestBrightness(props.groupedLight.dimming.brightness) >= BRIGHTNESS_MAX
  ) {
    return null;
  }

  // TODO: Why does this shortcut not work, but Increase Brightness for Light does?
  return (
    <ActionPanel.Item
      title="Increase Brightness"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
      icon={Icon.Plus}
      onAction={props.onIncrease}
    />
  );
}

function DecreaseBrightnessAction(props: { group: Group; groupedLight: GroupedLight; onDecrease: () => void }) {
  if (
    props.groupedLight.dimming === undefined ||
    getClosestBrightness(props.groupedLight.dimming.brightness) <= BRIGHTNESS_MIN
  ) {
    return null;
  }

  // TODO: Why does this shortcut not work, but Decrease Brightness for Light does?
  return (
    <ActionPanel.Item
      title="Decrease Brightness"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
      icon={Icon.Minus}
      onAction={props.onDecrease}
    />
  );
}

async function handleToggle(
  { hueBridgeState, setLights, setGroupedLights }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  groupLights: Light[],
  groupedLight: GroupedLight | undefined,
  group: Group
) {
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (groupedLight === undefined) throw new Error("Light group not found.");

    const changes = {
      on: { on: !groupedLight.on?.on },
      dynamics: { duration: getTransitionTimeInMs() },
      ...(groupedLight.dimming ? { dimming: { brightness: groupedLight.dimming?.brightness } } : {}),
    };

    // TODO: Update zones
    const changesToLights = new Map(groupLights.map((light) => [light.id, changes]));
    const undoOptimisticLightsUpdate = optimisticUpdates(changesToLights, setLights);
    const undoOptimisticGroupedLightUpdate = optimisticUpdate(groupedLight, changes, setGroupedLights);
    await hueBridgeState.context.hueClient.updateGroupedLight(groupedLight, changes).catch((e: Error) => {
      undoOptimisticLightsUpdate();
      undoOptimisticGroupedLightUpdate();
      throw e;
    });

    toast.style = Style.Success;
    toast.title = groupedLight.on?.on ? `Turned ${group.metadata.name} off` : `Turned ${group.metadata.name} on`;
    await toast.show();
  } catch (e) {
    console.error(e);
    toast.style = Style.Failure;
    toast.title = groupedLight?.on?.on
      ? `Failed turning ${group.metadata.name} off`
      : `Failed turning ${group.metadata.name} on`;
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleSetBrightness(
  { hueBridgeState, setLights }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  groupLights: Light[],
  groupedLight: GroupedLight | undefined,
  group: Group,
  brightness: number
) {
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (groupedLight === undefined) throw new Error("Light group not found.");
    if (!rateLimiter.canExecute()) return;

    const changes = {
      on: { on: true },
      dimming: { brightness: brightness },
      dynamics: { duration: getTransitionTimeInMs() },
    };

    const changesToLights = new Map(groupLights.map((light) => [light.id, changes]));
    const undoOptimisticUpdates = optimisticUpdates(changesToLights, setLights);
    await hueBridgeState.context.hueClient.updateGroupedLight(groupedLight, changes).catch((e: Error) => {
      undoOptimisticUpdates();
      throw e;
    });

    toast.style = Style.Success;
    toast.title = `Set brightness of ${group.metadata.name} to ${(brightness / 100).toLocaleString("en", {
      style: "percent",
    })}.`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = `Failed setting brightness of ${group.metadata.name}.`;
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleBrightnessChange(
  { hueBridgeState, lights, setLights }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  groupLights: Light[],
  groupedLight: GroupedLight | undefined,
  group: Group,
  direction: "increase" | "decrease"
) {
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (groupedLight === undefined) throw new Error("Light group not found.");
    if (!rateLimiter.canExecute()) return;

    const adjustedBrightness = calculateAdjustedBrightness(groupedLight.dimming?.brightness ?? 0, direction);

    const changes = {
      on: { on: true },
      // dimming_delta exists, but manually calculating the new value
      // enables the usage of the value in the optimistic update.
      dimming: { brightness: adjustedBrightness },
      dynamics: { duration: getTransitionTimeInMs() },
    };

    const changesToLights = new Map(getLightsFromGroup(lights, group).map((light) => [light.id, changes]));
    const undoOptimisticUpdates = optimisticUpdates(changesToLights, setLights);
    await hueBridgeState.context.hueClient.updateGroupedLight(groupedLight, changes).catch((e: Error) => {
      undoOptimisticUpdates();
      throw e;
    });

    toast.style = Style.Success;
    toast.title = `${direction === "increase" ? "Increased" : "Decreased"} brightness of ${group.metadata.name} to ${(
      adjustedBrightness / 100
    ).toLocaleString("en", {
      style: "percent",
    })}`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = `Failed ${direction === "increase" ? "increasing" : "decreasing"} brightness of ${
      group.metadata.name
    }`;
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}
