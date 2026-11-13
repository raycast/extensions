import { Action, ActionPanel, Grid, Icon, useNavigation } from "@raycast/api";
import type { Group, Scene } from "./lib/types";
import UnlinkAction from "./components/UnlinkAction";
import ManageHueBridge from "./components/ManageHueBridge";
import { Hue, useHue, useHueResources } from "./hooks/useHue";
import { createGradientUri } from "./helpers/svgImages";
import { useMemo } from "react";
import { getBrightnessFromScene, getColorsFromScene, getScenesFromGroup } from "./helpers/hueResources";

import { applyUpdate } from "./helpers/raycast";

export default function SetSceneCommand() {
  return <SetScene hue={useHue()} />;
}

export function SetScene(props: { group?: Group; hue: Hue }) {
  const { hueBridgeState, send, isLoading } = props.hue;
  const { rooms, zones, scenes } = useHueResources();
  const gradientUris = useMemo(
    () =>
      new Map(
        scenes.map((scene) => [scene.id, createGradientUri(getColorsFromScene(scene), getBrightnessFromScene(scene))]),
      ),
    [scenes],
  );
  const { pop } = useNavigation();

  // When pushed, the parent handles the bridge state.
  const manageHueBridgeElement = props.group ? null : ManageHueBridge(hueBridgeState, send);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  const groups = props.group ? [props.group] : [...rooms, ...zones];
  return (
    <Grid
      navigationTitle={props.group && `Set Scene for ${props.group.metadata.name}`}
      // When pushed, isLoading is frozen at push time, so a spinner would never stop.
      isLoading={!props.group && isLoading}
      aspectRatio="16/9"
      filtering={{ keepSectionOrder: true }}
    >
      {groups.map((group) => (
        <Grid.Section key={group.id} title={group.metadata.name}>
          {getScenesFromGroup(scenes, group).map((scene) => (
            <SceneItem
              key={scene.id}
              group={group}
              scene={scene}
              gradientUri={gradientUris.get(scene.id)}
              onSetScene={props.group && pop}
              // A pushed view's props stay as pushed, so the scenes come from this view's own hook.
              hue={{ ...props.hue, scenes }}
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}

function SceneItem(props: {
  scene: Scene;
  group: Group;
  gradientUri: string | undefined;
  onSetScene?: () => void;
  hue: Hue;
}) {
  return (
    <Grid.Item
      title={props.scene.metadata.name}
      accessory={props.scene.status.active !== "inactive" ? { icon: Icon.LightBulb, tooltip: "Active" } : undefined}
      keywords={[props.group.metadata.name]}
      content={props.gradientUri ?? ""}
      actions={
        <ActionPanel>
          <Action
            title="Set Scene"
            icon={Icon.Image}
            onAction={() => {
              handleSetScene(props.hue, props.group, props.scene).then();
              props.onSetScene?.();
            }}
          />
          <ActionPanel.Section>
            <UnlinkAction send={props.hue.send} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function handleSetScene(hue: Hue, group: Group, scene: Scene) {
  const changesToLights = new Map(
    scene.actions.map(({ target, action: { on, dimming, color, color_temperature } }) => [
      target.rid,
      // Clear the color temperature like the bridge does in color mode, as getColorFromLight prefers it over color.
      { on, dimming, color, color_temperature: color ? { mirek: null, mirek_valid: false } : color_temperature },
    ]),
  );
  return applyUpdate(hue, {
    lights: changesToLights,
    scene,
    request: (hueClient) =>
      hueClient.updateScene(scene, {
        recall: { action: "active" },
      }),
    success: `Scene ${scene.metadata.name} set for ${group.metadata.name}`,
    failure: `Failed setting scene ${scene.metadata.name} for ${group.metadata.name}`,
  });
}
