import { Action, ActionPanel, Icon, List, Toast } from "@raycast/api";
import { Group, Scene } from "./lib/types";
import UnlinkAction from "./components/UnlinkAction";
import ManageHueBridge from "./components/ManageHueBridge";
import { SendHueMessage, useHue } from "./hooks/useHue";
import HueClient from "./lib/HueClient";
import Style = Toast.Style;

export default function SetScene() {
  const { hueBridgeState, sendHueMessage, isLoading, rooms, zones, scenes } = useHue();

  const manageHueBridgeElement: JSX.Element | null = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  const groupTypes = [rooms, zones];

  return (
    <List isLoading={isLoading}>
      {groupTypes.map((groupType: Group[]): JSX.Element[] => {
        return groupType.map((group: Group): JSX.Element => {
          // const groupScenes = scenes.filter((scene: Scene) => {
          //   return scene.group == group.id;
          // }) ?? [];

          return (
            <Group
              hueClient={hueBridgeState.context.hueClient}
              key={group.id}
              group={group}
              scenes={[]}
              sendHueMessage={sendHueMessage}
            />
          );
        });
      })}
    </List>
  );
}

function Group(props: { hueClient?: HueClient; group: Group; scenes: Scene[]; sendHueMessage: SendHueMessage }) {
  return (
    <List.Section key={props.group.id} title={props.group.metadata.name} subtitle={props.group.type}>
      {props.scenes.map(
        (scene: Scene): JSX.Element => (
          <Scene
            hueClient={props.hueClient}
            key={scene.id}
            group={props.group}
            scene={scene}
            sendHueMessage={props.sendHueMessage}
          />
        )
      )}
    </List.Section>
  );
}

function Scene(props: { hueClient?: HueClient; group: Group; scene: Scene; sendHueMessage: SendHueMessage }) {
  return (
    <List.Item
      title={props.scene.metadata.name}
      keywords={[props.group.metadata.name]}
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
    // await mutateGroups(setScene(apiPromise, scene));

    toast.style = Style.Success;
    toast.title = `Scene ${scene.metadata.name} set`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed setting scene";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}
