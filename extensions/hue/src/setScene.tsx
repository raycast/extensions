import { Action, ActionPanel, Grid, Icon, Toast } from "@raycast/api";
import { Group, Scene } from "./lib/types";
import UnlinkAction from "./components/UnlinkAction";
import ManageHueBridge from "./components/ManageHueBridge";
import { SendHueMessage, useHue } from "./hooks/useHue";
import HueClient from "./lib/HueClient";
import { useEffect, useState } from "react";
import { createGradientPngUri, mirekToHexString, xyToRgbHexString } from "./lib/colors";
import Style = Toast.Style;

type ResourceId = string;
type GradientUri = string;

function getColorsFromScene(scene: Scene): string[] {
  if (scene.palette !== undefined) {
    if (scene.palette.color?.length ?? 0 > 0) {
      return scene.palette.color.map((color) => {
        // TODO: Determine brightness from dimming
        return xyToRgbHexString(color.color.xy);
      });
    }
    if (scene.palette.color_temperature?.length ?? 0 > 0) {
        // TODO: Determine brightness from dimming
      return scene.palette.color_temperature.map((color_temperature) => {
        return mirekToHexString(color_temperature.color_temperature.mirek);
      });
    }
    if (scene.palette.dimming?.length ?? 0 > 0) {
      return scene.palette.dimming.map((color) => {
        // TODO: Implement
        return "#d3d3d3";
      });
    }
  }

  if (scene.actions !== undefined) {
    return scene.actions
      .filter((action) => {
        return action.action.color !== undefined || action.action.color_temperature !== undefined;
      })
      .map((action) => {
        if (action.action.color_temperature?.mirek !== undefined) {
          // TODO: Determine brightness from dimming
          return mirekToHexString(action.action.color_temperature.mirek);
        }
        if (action.action.color?.xy !== undefined) {
          // TODO: Determine brightness from dimming
          return xyToRgbHexString(action.action.color.xy);
        }
        throw new Error("Invalid state.");
      });
  }

  return [];
}

export default function SetScene() {
  const { hueBridgeState, sendHueMessage, isLoading, rooms, zones, scenes } = useHue();
  const [gradients, setGradients] = useState(new Map<ResourceId, GradientUri>());

  useEffect(() => {
    (async () => {
      for (const scene of scenes) {
        const colors = getColorsFromScene(scene);

        if (colors.length > 0) {
          const gradientUri = await createGradientPngUri(colors, 269, 154);
          setGradients((gradients) => new Map(gradients).set(scene.id, gradientUri));
        }
      }
    })();
  }, [scenes]);

  const manageHueBridgeElement: JSX.Element | null = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;
  const groupTypes = [rooms, zones];

  return (
    <Grid isLoading={isLoading} aspectRatio="16/9">
      {groupTypes.map((groupType: Group[]): JSX.Element[] => {
        return groupType.map((group: Group): JSX.Element => {
          const groupScenes =
            scenes.filter((scene: Scene) => {
              return scene.group.rid === group.id;
            }) ?? [];

          return (
            <Group
              key={group.id}
              group={group}
              scenes={groupScenes}
              gradients={gradients}
              hueClient={hueBridgeState.context.hueClient}
              sendHueMessage={sendHueMessage}
            />
          );
        });
      })}
    </Grid>
  );
}

function Group(props: {
  group: Group;
  scenes: Scene[];
  gradients: Map<ResourceId, GradientUri>;
  hueClient?: HueClient;
  sendHueMessage: SendHueMessage;
}) {
  return (
    <Grid.Section key={props.group.id} title={props.group.metadata.name}>
      {props.scenes.map(
        (scene: Scene): JSX.Element => (
          <Scene
            key={scene.id}
            group={props.group}
            scene={scene}
            gradient={props.gradients.get(scene.id)}
            hueClient={props.hueClient}
            sendHueMessage={props.sendHueMessage}
          />
        )
      )}
    </Grid.Section>
  );
}

function Scene(props: {
  scene: Scene;
  group: Group;
  gradient: GradientUri | undefined;
  sendHueMessage: SendHueMessage;
  hueClient?: HueClient;
}) {
  return (
    <Grid.Item
      title={props.scene.metadata.name}
      keywords={[props.group.metadata.name]}
      content={props.gradient ?? Icon.XMarkCircle}
      actions={
        <ActionPanel>
          <SetSceneAction
            group={props.group}
            scene={props.scene}
            onSet={() => handleSetScene(props.hueClient, props.group, props.scene)}
          />
          <ActionPanel.Section>
            <UnlinkAction sendHueMessage={props.sendHueMessage} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SetSceneAction(props: { group: Group; scene: Scene; onSet: () => void }) {
  return <Action title="Set Scene" icon={Icon.Image} onAction={() => props.onSet()} />;
}

async function handleSetScene(hueClient: HueClient | undefined, group: Group, scene: Scene) {
  const toast = new Toast({ title: "" });

  try {
    if (hueClient === undefined) throw new Error("Hue client not initialized.");

    await hueClient.updateScene(scene, {
      recall: {
        action: "active",
      },
    });

    toast.style = Style.Success;
    toast.title = `Scene ${scene.metadata.name} set for ${group.metadata.name}.`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = `Failed setting scene ${scene.metadata.name} for ${group.metadata.name}.`;
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}
