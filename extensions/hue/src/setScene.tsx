import { Action, ActionPanel, Grid, Icon, useNavigation } from "@raycast/api";
import type { Group, Id, Light, Palette, PngUri, Scene } from "./lib/types";
import UnlinkAction from "./components/UnlinkAction";
import ManageHueBridge from "./components/ManageHueBridge";
import { useHue } from "./hooks/useHue";
import useGradients from "./hooks/useGradientUris";
import React, { useMemo, useState } from "react";
import { getColorsFromScene, getScenesFromGroup } from "./helpers/hueResources";

import { applyUpdate, getTransitionTimeInMs } from "./helpers/raycast";

// Exact dimensions of a 16:9 Raycast 5 column grid item.
const GRID_ITEM_WIDTH = 271;
const GRID_ITEM_HEIGHT = 153;

export default function SetScene(props: { group?: Group; useHue?: ReturnType<typeof useHue> }) {
  const useHueObject = props.useHue ?? useHue();
  const { hueBridgeState, sendHueMessage, isLoading, rooms, zones, scenes } = useHueObject;
  const [palettes, setPalettes] = useState(new Map<Id, Palette>([]));
  const { gradientUris } = useGradients(palettes, GRID_ITEM_WIDTH, GRID_ITEM_HEIGHT);
  const { pop } = useNavigation();

  useMemo(() => {
    setPalettes(new Map<Id, Palette>(scenes.map((scene) => [scene.id, getColorsFromScene(scene)])));
  }, [scenes]);

  const manageHueBridgeElement: React.JSX.Element | null = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  const groups = props.group ? [props.group] : [...rooms, ...zones];
  return (
    <Grid
      navigationTitle={props.group && `Set Scene for ${props.group.metadata.name}`}
      isLoading={isLoading}
      aspectRatio="16/9"
      filtering={{ keepSectionOrder: true }}
    >
      {groups.map((group) => (
        <Grid.Section key={group.id} title={group.metadata.name}>
          {getScenesFromGroup(scenes, group).map((scene) => (
            <Scene
              key={scene.id}
              group={group}
              scene={scene}
              gradientUri={gradientUris.get(scene.id)}
              onSetScene={props.group && pop}
              useHue={useHueObject}
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}

function Scene(props: {
  scene: Scene;
  group: Group;
  gradientUri: PngUri | undefined;
  onSetScene?: () => void;
  useHue: ReturnType<typeof useHue>;
}) {
  const activeEmoji = !(props.scene.status?.active === "inactive") ? "💡 " : "";
  return (
    <Grid.Item
      title={activeEmoji + props.scene.metadata.name}
      keywords={[props.group.metadata.name]}
      content={props.gradientUri ?? ""}
      actions={
        <ActionPanel>
          <Action
            title="Set Scene"
            icon={Icon.Image}
            onAction={() => {
              handleSetScene(props.useHue, props.group, props.scene).then();
              props.onSetScene?.();
            }}
          />
          <ActionPanel.Section>
            <UnlinkAction sendHueMessage={props.useHue.sendHueMessage} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function handleSetScene(hue: ReturnType<typeof useHue>, group: Group, scene: Scene) {
  const changesToLights = new Map(
    scene.actions.map(({ target, action }) => [
      target.rid,
      // Clear the color temperature like the bridge does in color mode, as getColorFromLight prefers it over color.
      (action.color ? { ...action, color_temperature: { mirek: null, mirek_valid: false } } : action) as Partial<Light>,
    ]),
  );
  const changesToGroupedLights = new Map(
    group.services
      .filter((resource) => resource.rtype === "grouped_light")
      .map((resource) => [resource.rid, { on: { on: scene.actions.some(({ action }) => action.on?.on) } }]),
  );

  return applyUpdate(hue, {
    lights: changesToLights,
    groupedLights: changesToGroupedLights,
    request: (hueClient) =>
      hueClient.updateScene(scene, {
        recall: {
          action: "active",
          duration: getTransitionTimeInMs(),
        },
      }),
    success: `Scene ${scene.metadata.name} set for ${group.metadata.name}`,
    failure: `Failed setting scene ${scene.metadata.name} for ${group.metadata.name}`,
  });
}
