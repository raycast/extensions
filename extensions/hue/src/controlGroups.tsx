import { Action, ActionPanel, Grid, Icon, Image } from "@raycast/api";
import type { Group, Light } from "./lib/types";
import ManageHueBridge from "./components/ManageHueBridge";
import { Hue, useHue } from "./hooks/useHue";
import React, { useMemo } from "react";
import { createGroupIcon } from "./helpers/svgImages";
import { useInputRateLimiter } from "./hooks/useInputRateLimiter";
import UnlinkAction from "./components/UnlinkAction";
import BrightnessActions from "./components/BrightnessActions";
import { SetScene } from "./setScene";
import {
  getColorsFromGroup,
  getGroupedLightFromGroup,
  getLightsFromGroup,
  GroupedLightState,
} from "./helpers/hueResources";
import { byName } from "./helpers/collections";
import { applyUpdate } from "./helpers/raycast";

export default function ControlGroups() {
  const hue = useHue();
  const { hueBridgeState, send, isLoading, lights, rooms, zones } = hue;
  // groupedLightsQueue sends one request per second, so faster input would only queue up there.
  const canExecute = useInputRateLimiter(1000);
  const icons = useMemo(
    () =>
      new Map(
        [...rooms, ...zones].map((group) => [
          group.id,
          createGroupIcon(group, getColorsFromGroup(lights, group), getGroupedLightFromGroup(lights, group)),
        ]),
      ),
    [rooms, zones, lights],
  );

  const manageHueBridgeElement: React.JSX.Element | null = ManageHueBridge(hueBridgeState, send);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  return (
    <Grid isLoading={isLoading} aspectRatio="16/9" fit={Grid.Fit.Fill} filtering={{ keepSectionOrder: true }}>
      {[
        { title: "Rooms", groups: rooms },
        { title: "Zones", groups: zones },
      ].map(
        ({ title, groups }) =>
          groups.length > 0 && (
            <Grid.Section key={title} title={title}>
              {groups.toSorted(byName).map((group) => (
                <GroupItem
                  key={group.id}
                  group={group}
                  groupLights={getLightsFromGroup(lights, group)}
                  groupedLight={getGroupedLightFromGroup(lights, group)}
                  icon={icons.get(group.id)}
                  hue={hue}
                  canExecute={canExecute}
                />
              ))}
            </Grid.Section>
          ),
      )}
    </Grid>
  );
}

function GroupItem(props: {
  groupLights: Light[];
  groupedLight?: GroupedLightState;
  group: Group;
  icon?: Image;
  hue: Hue;
  canExecute: () => boolean;
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

  return (
    <Grid.Item
      title={props.group.metadata.name}
      subtitle={lightStatusText}
      content={props.icon ?? ""}
      actions={
        groupedLight && (
          <ActionPanel>
            <ToggleGroupAction
              group={props.group}
              groupedLight={groupedLight}
              onToggle={() => handleToggle(props.hue, props.canExecute, props.groupLights, groupedLight, props.group)}
            />
            <Action.Push
              title="Set Scene"
              icon={Icon.Image}
              target={<SetScene group={props.group} hue={props.hue} />}
            />
            <ActionPanel.Section>
              {groupedLight.dimming && (
                <BrightnessActions
                  brightness={groupedLight.dimming.brightness}
                  onSet={(brightness) =>
                    handleSetBrightness(
                      props.hue,
                      props.canExecute,
                      props.groupLights,
                      groupedLight,
                      props.group,
                      brightness,
                    )
                  }
                />
              )}
            </ActionPanel.Section>

            <ActionPanel.Section>
              <UnlinkAction send={props.hue.send} />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}

function ToggleGroupAction(props: { group: Group; groupedLight: GroupedLightState; onToggle: () => void }) {
  return (
    <Action
      title={`Turn ${props.group.metadata.name} ${props.groupedLight.on?.on ? "Off" : "On"}`}
      icon={props.groupedLight.on?.on ? Icon.LightBulbOff : Icon.LightBulb}
      onAction={props.onToggle}
    />
  );
}

export function handleToggle(
  hue: Hue,
  canExecute: () => boolean,
  groupLights: Light[],
  groupedLight: GroupedLightState,
  group: Group,
) {
  const changesToGroup = { on: { on: !groupedLight.on?.on } };
  const changesToLights = new Map(groupLights.map((light) => [light.id, changesToGroup]));

  return applyUpdate(hue, {
    canExecute,
    lights: changesToLights,
    request: (hueClient) => hueClient.updateGroupedLight(groupedLight, changesToGroup),
    success: `Turned ${groupedLight.on?.on ? "off" : "on"} ${group.metadata.name}`,
    failure: `Failed turning ${groupedLight.on?.on ? "off" : "on"} ${group.metadata.name}`,
  });
}

export function handleSetBrightness(
  hue: Hue,
  canExecute: () => boolean,
  groupLights: Light[],
  groupedLight: GroupedLightState,
  group: Group,
  brightness: number,
) {
  const changes = {
    on: { on: true },
    dimming: { brightness: brightness },
  };

  const changesToLights = new Map(groupLights.map((light) => [light.id, changes]));

  return applyUpdate(hue, {
    canExecute,
    lights: changesToLights,
    request: (hueClient) => hueClient.updateGroupedLight(groupedLight, changes),
    success: `Set brightness of ${group.metadata.name} to ${(brightness / 100).toLocaleString("en", { style: "percent" })}`,
    failure: `Failed setting brightness of ${group.metadata.name}`,
  });
}
