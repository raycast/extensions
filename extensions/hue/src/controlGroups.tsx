import { Action, ActionPanel, Color, Grid, Icon, Image, Toast, useNavigation } from "@raycast/api";
import type { Group, GroupedLight, Id, Light, Palette, PngUri, Room, Zone } from "./lib/types";
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, BRIGHTNESSES } from "./helpers/constants";
import ManageHueBridge from "./components/ManageHueBridge";
import { useHue } from "./hooks/useHue";
import { getProgressIcon } from "@raycast/utils";
import React, { useMemo, useState } from "react";
import useGradientUris from "./hooks/useGradientUris";
import "./helpers/arrayExtensions";
import useInputRateLimiter from "./hooks/useInputRateLimiter";
import UnlinkAction from "./components/UnlinkAction";
import SetScene from "./setScene";
import { getColorFromLight, getLightsFromGroup } from "./helpers/hueResources";
import { getTransitionTimeInMs, optimisticUpdates } from "./helpers/raycast";
import { calculateAdjustedBrightness, getClosestBrightness } from "./helpers/colors";
import chroma from "chroma-js";
import Style = Toast.Style;

// Exact dimensions of a 16:9 Raycast 5 column grid item.
const GRID_ITEM_WIDTH = 271;
const GRID_ITEM_HEIGHT = 153;

export default function ControlGroups() {
  const useHueObject = useHue();
  const { hueBridgeState, sendHueMessage, isLoading, lights, groupedLights, rooms, zones } = useHueObject;
  const rateLimiter = useInputRateLimiter(3, 1000);
  const [palettes, setPalettes] = useState(new Map<Id, Palette>([]));
  const { gradientUris } = useGradientUris(palettes, GRID_ITEM_WIDTH, GRID_ITEM_HEIGHT);

  useMemo(() => {
    const groups = [...rooms, ...zones];
    const palettes = new Map<Id, Palette>(
      groups.map((group) => {
        const groupLights = getLightsFromGroup(lights, group);
        const uniqueColors = new Set(groupLights.map((light) => getColorFromLight(light)));
        const groupColors = groupLights
          .filter((light) => uniqueColors.has(getColorFromLight(light)))
          .map((light) => getColorFromLight(light))
          .sort((a, b) => chroma.hex(b).get("hsl.h") - chroma.hex(a).get("hsl.h"));
        return [group.id, groupColors];
      }),
    );

    setPalettes(palettes);
  }, [rooms, zones, lights]);

  const manageHueBridgeElement: React.JSX.Element | null = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  return (
    <Grid isLoading={isLoading} aspectRatio="16/9" fit={Grid.Fit.Fill} filtering={{ keepSectionOrder: true }}>
      {rooms.length > 0 && (
        <Grid.Section title="Rooms">
          {[...rooms]
            .sort((a, b) => a.metadata.name.localeCompare(b.metadata.name))
            .map((room: Room) => {
              const groupLights = getLightsFromGroup(lights, room).sort((a, b) =>
                a.metadata.name.localeCompare(b.metadata.name),
              );
              const groupedLight = groupedLights.find(
                (groupedLight) =>
                  groupedLight.id === room.services.find((resource) => resource.rtype === "grouped_light")?.rid,
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
          {[...zones]
            .sort((a, b) => a.metadata.name.localeCompare(b.metadata.name))
            .map((zone: Zone) => {
              const groupLights = getLightsFromGroup(lights, zone);
              const groupedLight = groupedLights.find(
                (groupedLight) =>
                  groupedLight.id === zone.services.find((resource) => resource.rtype === "grouped_light")?.rid,
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
  gradientUri?: PngUri;
  useHue: ReturnType<typeof useHue>;
  rateLimiter: ReturnType<typeof useInputRateLimiter>;
}) {
  const lightsOnCount = props.groupLights.filter((light) => light.on.on).length;
  let lightStatusText;
  if (lightsOnCount === 0) {
    lightStatusText = "All lights are off";
  } else if (lightsOnCount === props.groupLights.length) {
    lightStatusText = "All lights are on";
  } else {
    lightStatusText = `${lightsOnCount} out of ${props.groupLights.length} lights are on`;
  }

  const content = props.groupedLight?.on?.on
    ? (props.gradientUri ?? "")
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
                    brightness,
                  )
                }
              />
              <IncreaseBrightnessAction
                group={props.group}
                groupedLight={props.groupedLight}
                onIncrease={() =>
                  handleBrightnessChange(props.useHue, props.rateLimiter, props.groupedLight, props.group, "increase")
                }
              />
              <DecreaseBrightnessAction
                group={props.group}
                groupedLight={props.groupedLight}
                onDecrease={() =>
                  handleBrightnessChange(props.useHue, props.rateLimiter, props.groupedLight, props.group, "decrease")
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
    <Action
      title={`Turn ${props.group.metadata.name} ${props.groupedLight.on?.on ? "Off" : "On"}`}
      icon={props.groupedLight.on?.on ? Icon.LightBulbOff : Icon.LightBulb}
      onAction={props.onToggle}
    />
  );
}

function SetSceneAction(props: { group: Group; useHue: ReturnType<typeof useHue> }) {
  const { push } = useNavigation();

  return (
    <Action
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
        <Action key={brightness} title={`${brightness}% Brightness`} onAction={() => props.onSet(brightness)} />
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

  return (
    <Action
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

  return (
    <Action
      title="Decrease Brightness"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
      icon={Icon.Minus}
      onAction={props.onDecrease}
    />
  );
}

async function handleToggle(
  { hueBridgeState, groupedLights, setGroupedLights, zones }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  groupLights: Light[],
  groupedLight: GroupedLight | undefined,
  group: Group,
) {
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (groupedLight === undefined) throw new Error("Light group not found.");
    if (!rateLimiter.canExecute()) return;

    const changes = {
      on: { on: !groupedLight.on?.on },
      // No dynamics when toggling groups, as that causes the brightness to the set to the lowest possible level,
      //   even when only applied to toggling off.
    };

    const changesToGroupedLights = new Map(
      zones
        // Find zones that contain affected lights
        .filter((zone) =>
          zone.children.some((child) =>
            groupLights.some((light) => light.id === child.rid || light.owner.rid === child.rid),
          ),
        )
        // Get the grouped lights that belong to those zones
        .map((zone) =>
          groupedLights.find((zoneGroupedLight) =>
            zone.services.some((zoneService) => zoneService.rid === zoneGroupedLight.id),
          ),
        )
        // Filter out undefined grouped lights
        .filter((zoneGroupedLight): zoneGroupedLight is GroupedLight => zoneGroupedLight !== undefined)
        .map((zoneGroupedLight) => [zoneGroupedLight.id, changes]),
    )
      // Add the grouped light that triggered the action
      .set(groupedLight.id, changes);

    const undoOptimisticGroupedLightsUpdate = optimisticUpdates(changesToGroupedLights, setGroupedLights);
    await hueBridgeState.context.hueClient.updateGroupedLight(groupedLight, changes).catch((error: Error) => {
      if (error.message === 'device (grouped_light) is "soft off", command (.on) may not have effect') return;
      undoOptimisticGroupedLightsUpdate();
      throw error;
    });

    toast.style = Style.Success;
    toast.title = groupedLight.on?.on ? `Turned ${group.metadata.name} off` : `Turned ${group.metadata.name} on`;
    await toast.show();
  } catch (error) {
    console.error(error);
    toast.style = Style.Failure;
    toast.title = groupedLight?.on?.on
      ? `Failed turning ${group.metadata.name} off`
      : `Failed turning ${group.metadata.name} on`;
    toast.message = error instanceof Error ? error.message : undefined;
    await toast.show();
  }
}

async function handleSetBrightness(
  { hueBridgeState, setLights }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  groupLights: Light[],
  groupedLight: GroupedLight | undefined,
  group: Group,
  brightness: number,
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
  } catch (error) {
    toast.style = Style.Failure;
    toast.title = `Failed setting brightness of ${group.metadata.name}.`;
    toast.message = error instanceof Error ? error.message : undefined;
    await toast.show();
  }
}

async function handleBrightnessChange(
  { hueBridgeState, lights, setLights }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  groupedLight: GroupedLight | undefined,
  group: Group,
  direction: "increase" | "decrease",
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
  } catch (error) {
    toast.style = Style.Failure;
    toast.title = `Failed ${direction === "increase" ? "increasing" : "decreasing"} brightness of ${
      group.metadata.name
    }`;
    toast.message = error instanceof Error ? error.message : undefined;
    await toast.show();
  }
}
