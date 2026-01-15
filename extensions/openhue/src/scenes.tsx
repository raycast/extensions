import { List, ActionPanel, Action, Icon, showToast, Toast, Color, openExtensionPreferences } from "@raycast/api";
import { useScenesWithRooms, getRoomName } from "./hooks/useHue";
import { activateScene, groupScenesByRoom } from "./api/scenes";
import { Scene } from "./api/types";
import { getCredentials } from "./api/client";

export default function ScenesCommand() {
  const credentials = getCredentials();

  if (!credentials) {
    return <NoBridgeConfigured />;
  }

  return <ScenesList />;
}

function NoBridgeConfigured() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Hue Bridge Not Configured"
        description="Please run 'Setup Hue Bridge' to connect to your Philips Hue system."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function ScenesList() {
  const { scenes, rooms, isLoading, error, revalidate } = useScenesWithRooms();

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load scenes",
      message: error.message,
    });
  }

  // Group scenes by room
  const scenesByRoom = groupScenesByRoom(scenes);

  // Sort rooms by name and convert to array
  const sortedRooms = Array.from(scenesByRoom.entries())
    .map(([roomId, roomScenes]) => ({
      roomId,
      roomName: getRoomName(roomId, rooms),
      scenes: roomScenes.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name)),
    }))
    .sort((a, b) => a.roomName.localeCompare(b.roomName));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search scenes...">
      {sortedRooms.map(({ roomId, roomName, scenes: roomScenes }) => (
        <List.Section key={roomId} title={roomName} subtitle={`${roomScenes.length} scenes`}>
          {roomScenes.map((scene) => (
            <SceneListItem key={scene.id} scene={scene} revalidate={revalidate} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function SceneListItem({ scene, revalidate }: { scene: Scene; revalidate: () => Promise<void> }) {
  const isActive = scene.status?.active !== "inactive";

  const accessories: List.Item.Accessory[] = [];

  if (isActive) {
    accessories.push({
      icon: { source: Icon.Circle, tintColor: Color.Green },
      tooltip: "Active",
    });
  }

  const handleActivate = async (action: "active" | "dynamic_palette" | "static" = "active") => {
    try {
      await activateScene(scene.id, action);
      await showToast({
        style: Toast.Style.Success,
        title: `Scene "${scene.metadata.name}" activated`,
      });
      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to activate scene",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List.Item
      icon={Icon.Image}
      title={scene.metadata.name}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action icon={Icon.Play} title="Activate Scene" onAction={() => handleActivate("active")} />
            <Action
              icon={Icon.PlayFilled}
              title="Activate with Dynamic Colors"
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => handleActivate("dynamic_palette")}
            />
            <Action
              icon={Icon.Pause}
              title="Activate Static"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => handleActivate("static")}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              icon={Icon.ArrowClockwise}
              title="Refresh"
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={revalidate}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
