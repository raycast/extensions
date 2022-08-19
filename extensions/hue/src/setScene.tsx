import { Action, ActionPanel, Icon, List, Toast } from "@raycast/api";
import { setScene, useHue } from "./lib/hue";
import { MutatePromise } from "@raycast/utils";
import { Group, Scene } from "./lib/types";
import { CouldNotConnectToHueBridgeError, NoHueBridgeConfiguredError } from "./lib/errors";
import NoHueBridgeConfigured from "./components/noHueBridgeConfigured";
import BridgeNotFound from "./components/bridgeNotFound";
import Style = Toast.Style;

export default function SetScene() {
  const { isLoading, lightsError, groups, mutateGroups, scenes } = useHue();

  const rooms = groups.filter((group) => group.type === "Room") as Group[];
  const entertainmentAreas = groups.filter((group) => group.type === "Entertainment") as Group[];
  const zones = groups.filter((group) => group.type === "Zone") as Group[];

  if (lightsError instanceof NoHueBridgeConfiguredError) return <NoHueBridgeConfigured />;
  if (lightsError instanceof CouldNotConnectToHueBridgeError) return <BridgeNotFound />;

  const groupTypes = Array.of(rooms, entertainmentAreas, zones);

  return (
    <List isLoading={isLoading}>
      {groupTypes.map((groupType: Group[]): JSX.Element[] => {
        return groupType.map((group: Group): JSX.Element => {
          const groupScenes =
            scenes.filter((scene: Scene) => {
              return scene.group == group.id;
            }) ?? [];

          return <Group key={group.id} group={group} scenes={groupScenes} mutateGroups={mutateGroups} />;
        });
      })}
    </List>
  );
}

function Group(props: { group: Group; scenes: Scene[]; mutateGroups: MutatePromise<Group[]> }) {
  return (
    <List.Section key={props.group.id} title={props.group.name} subtitle={props.group.type}>
      {props.scenes.map(
        (scene: Scene): JSX.Element => (
          <Scene key={scene.id} group={props.group} scene={scene} mutateGroups={props.mutateGroups} />
        )
      )}
    </List.Section>
  );
}

function Scene(props: { group: Group; scene: Scene; mutateGroups: MutatePromise<Group[]> }) {
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
