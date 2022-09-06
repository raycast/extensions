import { Action, ActionPanel, Icon, List, Toast } from "@raycast/api";
import { SendHueMessage, setScene, useHue } from "./lib/hue";
import { MutatePromise } from "@raycast/utils";
import { Group, Scene } from "./lib/types";
import UnlinkAction from "./components/UnlinkAction";
import ManageHueBridge from "./components/ManageHueBridge";
import Style = Toast.Style;

export default function SetScene() {
  const { isLoading, groups, mutateGroups, scenes, hueBridgeState, sendHueMessage } = useHue();

  const manageHueBridgeElement: JSX.Element | null = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  const rooms = groups.filter((group) => group.type === "Room") as Group[];
  const entertainmentAreas = groups.filter((group) => group.type === "Entertainment") as Group[];
  const zones = groups.filter((group) => group.type === "Zone") as Group[];
  const groupTypes = Array.of(rooms, entertainmentAreas, zones);

  return (
    <List isLoading={isLoading}>
      {groupTypes.map((groupType: Group[]): JSX.Element[] => {
        return groupType.map((group: Group): JSX.Element => {
          const groupScenes =
            scenes.filter((scene: Scene) => {
              return scene.group == group.id;
            }) ?? [];

          return (
            <Group
              key={group.id}
              group={group}
              scenes={groupScenes}
              mutateGroups={mutateGroups}
              sendHueMessage={sendHueMessage}
            />
          );
        });
      })}
    </List>
  );
}

function Group(props: {
  group: Group;
  scenes: Scene[];
  mutateGroups: MutatePromise<Group[]>;
  sendHueMessage: SendHueMessage;
}) {
  return (
    <List.Section key={props.group.id} title={props.group.name} subtitle={props.group.type}>
      {props.scenes.map(
        (scene: Scene): JSX.Element => (
          <Scene
            key={scene.id}
            group={props.group}
            scene={scene}
            mutateGroups={props.mutateGroups}
            sendHueMessage={props.sendHueMessage}
          />
        )
      )}
    </List.Section>
  );
}

function Scene(props: {
  group: Group;
  scene: Scene;
  mutateGroups: MutatePromise<Group[]>;
  sendHueMessage: SendHueMessage;
}) {
  return (
    <List.Item
      title={props.scene.name}
      keywords={[props.group.name]}
      actions={
        <ActionPanel>
          <SetSceneAction
            group={props.group}
            scene={props.scene}
            onSet={() => handleSetScene(props.group, props.scene, props.mutateGroups)}
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

async function handleSetScene(group: Group, scene: Scene, mutateGroups: MutatePromise<Group[]>) {
  const toast = new Toast({ title: "" });

  try {
    await mutateGroups(setScene(scene));

    toast.style = Style.Success;
    toast.title = `Scene ${scene.name} set`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed setting scene";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}
