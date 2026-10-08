import { Action, ActionPanel, Color, Grid, Icon, Image, useNavigation } from "@raycast/api";
import type { Group, GroupedLight, Light, Room, Zone } from "./lib/types";
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, BRIGHTNESSES } from "./helpers/constants";
import ManageHueBridge from "./components/ManageHueBridge";
import { useHue } from "./hooks/useHue";
import { getProgressIcon } from "@raycast/utils";
import React, { useMemo } from "react";
import { createGradientUri } from "./helpers/svgImages";
import useInputRateLimiter from "./hooks/useInputRateLimiter";
import UnlinkAction from "./components/UnlinkAction";
import { SetScene } from "./setScene";
import { getColorsFromGroup, getGroupedLightFromGroup, getLightsFromGroup } from "./helpers/hueResources";
import { byName } from "./helpers/collections";
import { applyUpdate, getTransitionTimeInMs } from "./helpers/raycast";
import { calculateAdjustedBrightness, getClosestBrightness } from "./helpers/colors";

// Exact dimensions of a 16:9 Raycast 5 column grid item.
const GRID_ITEM_WIDTH = 271;
const GRID_ITEM_HEIGHT = 153;

export default function ControlGroups() {
  const useHueObject = useHue();
  const { hueBridgeState, sendHueMessage, isLoading, lights, groupedLights, rooms, zones } = useHueObject;
  // groupedLightsQueue sends one request per second, so faster input would only be dropped there.
  const rateLimiter = useInputRateLimiter(1, 1000);
  const gradientUris = useMemo(
    () =>
      new Map(
        [...rooms, ...zones].map((group) => [
          group.id,
          createGradientUri(getColorsFromGroup(lights, group), GRID_ITEM_WIDTH, GRID_ITEM_HEIGHT),
        ]),
      ),
    [rooms, zones, lights],
  );

  const manageHueBridgeElement: React.JSX.Element | null = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  return (
    <Grid isLoading={isLoading} aspectRatio="16/9" fit={Grid.Fit.Fill} filtering={{ keepSectionOrder: true }}>
      {rooms.length > 0 && (
        <Grid.Section title="Rooms">
          {[...rooms].sort(byName).map((room: Room) => {
            const groupLights = getLightsFromGroup(lights, room);
            const groupedLight = getGroupedLightFromGroup(groupedLights, room);

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
          {[...zones].sort(byName).map((zone: Zone) => {
            const groupLights = getLightsFromGroup(lights, zone);
            const groupedLight = getGroupedLightFromGroup(groupedLights, zone);

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
  const { groupedLight } = props;
  const lightsOnCount = props.groupLights.filter((light) => light.on.on).length;
  let lightStatusText;
  if (lightsOnCount === 0) {
    lightStatusText = "All lights are off";
  } else if (lightsOnCount === props.groupLights.length) {
    lightStatusText = "All lights are on";
  } else {
    lightStatusText = `${lightsOnCount} out of ${props.groupLights.length} lights are on`;
  }

  const content = groupedLight?.on?.on
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
        groupedLight && (
          <ActionPanel>
            <ToggleGroupAction
              group={props.group}
              groupedLight={groupedLight}
              onToggle={() =>
                handleToggle(props.useHue, props.rateLimiter, props.groupLights, groupedLight, props.group)
              }
            />
            <SetSceneAction group={props.group} useHue={props.useHue} />
            <ActionPanel.Section>
              <SetBrightnessAction
                group={props.group}
                groupedLight={groupedLight}
                onSet={(brightness: number) =>
                  handleSetBrightness(
                    props.useHue,
                    props.rateLimiter,
                    props.groupLights,
                    groupedLight,
                    props.group,
                    brightness,
                  )
                }
              />
              <IncreaseBrightnessAction
                group={props.group}
                groupedLight={groupedLight}
                onIncrease={() =>
                  handleBrightnessChange(
                    props.useHue,
                    props.rateLimiter,
                    props.groupLights,
                    groupedLight,
                    props.group,
                    "increase",
                  )
                }
              />
              <DecreaseBrightnessAction
                group={props.group}
                groupedLight={groupedLight}
                onDecrease={() =>
                  handleBrightnessChange(
                    props.useHue,
                    props.rateLimiter,
                    props.groupLights,
                    groupedLight,
                    props.group,
                    "decrease",
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
      icon={getProgressIcon((props.groupedLight.dimming?.brightness ?? 0) / 100, Color.PrimaryText)}
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
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "arrowUp" },
        Windows: { modifiers: ["ctrl", "shift"], key: "arrowUp" },
      }}
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
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "arrowDown" },
        Windows: { modifiers: ["ctrl", "shift"], key: "arrowDown" },
      }}
      icon={Icon.Minus}
      onAction={props.onDecrease}
    />
  );
}

function handleToggle(
  hue: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  groupLights: Light[],
  groupedLight: GroupedLight,
  group: Group,
) {
  const { groupedLights, lights, zones } = hue;
  const changesToGroup = {
    on: { on: !groupedLight.on?.on },
    // No dynamics when toggling groups, as that causes the brightness to the set to the lowest possible level,
    //   even when only applied to toggling off.
  };
  const otherLightsOn = lights.filter((light) => light.on.on && !groupLights.some(({ id }) => id === light.id));

  const changesToGroupedLights = new Map(
    zones
      // Find zones that contain affected lights
      .filter((zone) => getLightsFromGroup(groupLights, zone).length > 0)
      // When turning off, skip zones that other lights keep on
      .filter((zone) => changesToGroup.on.on || getLightsFromGroup(otherLightsOn, zone).length === 0)
      .map((zone) => getGroupedLightFromGroup(groupedLights, zone))
      // Filter out undefined grouped lights
      .filter((zoneGroupedLight): zoneGroupedLight is GroupedLight => zoneGroupedLight !== undefined)
      .map((zoneGroupedLight) => [zoneGroupedLight.id, changesToGroup]),
  )
    // Add the grouped light that triggered the action
    .set(groupedLight.id, changesToGroup);

  const changesToLights = new Map(groupLights.map((light) => [light.id, changesToGroup]));

  return applyUpdate(hue, {
    rateLimiter,
    lights: changesToLights,
    groupedLights: changesToGroupedLights,
    request: (hueClient) =>
      hueClient.updateGroupedLight(groupedLight, changesToGroup).catch((error: Error) => {
        if (error.message !== 'device (grouped_light) is "soft off", command (.on) may not have effect') throw error;
      }),
    success: `Turned ${groupedLight?.on?.on ? "off" : "on"} ${group.metadata.name}`,
    failure: `Failed turning ${groupedLight?.on?.on ? "off" : "on"} ${group.metadata.name}`,
  });
}

function handleSetBrightness(
  hue: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  groupLights: Light[],
  groupedLight: GroupedLight,
  group: Group,
  brightness: number,
) {
  const changes = {
    on: { on: true },
    dimming: { brightness: brightness },
    dynamics: { duration: getTransitionTimeInMs() },
  };

  const changesToGroupedLights = new Map([[groupedLight.id, changes]]);
  const changesToLights = new Map(groupLights.map((light) => [light.id, changes]));

  return applyUpdate(hue, {
    rateLimiter,
    lights: changesToLights,
    groupedLights: changesToGroupedLights,
    request: (hueClient) => hueClient.updateGroupedLight(groupedLight, changes),
    success: `Set brightness of ${group.metadata.name} to ${(brightness / 100).toLocaleString("en", { style: "percent" })}`,
    failure: `Failed setting brightness of ${group.metadata.name}`,
  });
}

function handleBrightnessChange(
  hue: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  groupLights: Light[],
  groupedLight: GroupedLight,
  group: Group,
  direction: "increase" | "decrease",
) {
  const adjustedBrightness = calculateAdjustedBrightness(groupedLight.dimming?.brightness ?? 0, direction);

  const changes = {
    on: { on: true },
    // dimming_delta exists, but manually calculating the new value
    // enables the usage of the value in the optimistic update.
    dimming: { brightness: adjustedBrightness },
    dynamics: { duration: getTransitionTimeInMs() },
  };

  const changesToGroupedLights = new Map([[groupedLight.id, changes]]);
  const changesToLights = new Map(groupLights.map((light) => [light.id, changes]));

  return applyUpdate(hue, {
    rateLimiter,
    lights: changesToLights,
    groupedLights: changesToGroupedLights,
    request: (hueClient) => hueClient.updateGroupedLight(groupedLight, changes),
    success: `${direction === "increase" ? "Increased" : "Decreased"} brightness of ${group.metadata.name} to ${(adjustedBrightness / 100).toLocaleString("en", { style: "percent" })}`,
    failure: `Failed ${direction === "increase" ? "increasing" : "decreasing"} brightness of ${group.metadata.name}`,
  });
}
