import { Action, ActionPanel, Grid, Icon, Toast } from "@raycast/api";
import { GradientCache, GradientUri, Group, Scene } from "./lib/types";
import UnlinkAction from "./components/UnlinkAction";
import ManageHueBridge from "./components/ManageHueBridge";
import { SendHueMessage, useHue } from "./hooks/useHue";
import HueClient from "./lib/HueClient";
import useSceneGradients from "./hooks/useSceneGradients";
import Style = Toast.Style;

export default function SetScene() {
  const { hueBridgeState, sendHueMessage, isLoading, rooms, zones, scenes } = useHue();
  const { gradients } = useSceneGradients(scenes, 269, 154);
  const groupTypes = [rooms, zones];

  const manageHueBridgeElement: JSX.Element | null = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

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
  gradients: GradientCache;
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
      content={props.gradient ?? ""}
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
