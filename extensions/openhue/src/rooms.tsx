import { List, ActionPanel, Action, Icon, showToast, Toast, Color, openExtensionPreferences } from "@raycast/api";
import { useLightsWithRooms, findGroupedLightForRoom } from "./hooks/useHue";
import { toggleRoom, setRoomBrightness } from "./api/rooms";
import { activateScene } from "./api/scenes";
import type { RoomGet as Room, GroupedLightGet as GroupedLight, SceneGet as Scene } from "./api/generated/src/models";
import { getCredentials } from "./api/client";

export default function RoomsCommand() {
  const credentials = getCredentials();

  if (!credentials) {
    return <NoBridgeConfigured />;
  }

  return <RoomsList />;
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

function RoomsList() {
  const { rooms, groupedLights, scenes, isLoading, error, revalidate } = useLightsWithRooms();

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load rooms",
      message: error.message,
    });
  }

  // Sort rooms by name
  const sortedRooms = [...rooms].sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search rooms...">
      {sortedRooms.map((room) => {
        const groupedLight = findGroupedLightForRoom(room, groupedLights);
        const roomScenes = scenes.filter((s) => s.group?.rid === room.id);
        return (
          <RoomListItem
            key={room.id}
            room={room}
            groupedLight={groupedLight}
            scenes={roomScenes}
            revalidate={revalidate}
          />
        );
      })}
    </List>
  );
}

function RoomListItem({
  room,
  groupedLight,
  scenes,
  revalidate,
}: {
  room: Room;
  groupedLight: GroupedLight | undefined;
  scenes: Scene[];
  revalidate: () => Promise<void>;
}) {
  const isOn = groupedLight?.on.on ?? false;
  const brightness = groupedLight?.dimming?.brightness ?? 100;
  const lightCount = room.children.filter((c) => c.rtype === "device").length;

  // Get archetype icon
  const archetypeIcon = getArchetypeIcon(room.metadata.archetype);

  const accessories: List.Item.Accessory[] = [];

  if (groupedLight?.dimming) {
    accessories.push({ text: `${Math.round(brightness)}%` });
  }

  accessories.push({ text: `${lightCount} lights` });

  accessories.push({
    icon: isOn
      ? { source: Icon.Circle, tintColor: Color.Green }
      : { source: Icon.CircleDisabled, tintColor: Color.SecondaryText },
    tooltip: isOn ? "On" : "Off",
  });

  const handleToggle = async () => {
    if (!groupedLight) return;

    try {
      await toggleRoom(groupedLight.id, !isOn);
      await showToast({
        style: Toast.Style.Success,
        title: `${room.metadata.name} turned ${isOn ? "off" : "on"}`,
      });
      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle room",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleSetBrightness = async (value: number) => {
    if (!groupedLight) return;

    try {
      await setRoomBrightness(groupedLight.id, value);
      await showToast({
        style: Toast.Style.Success,
        title: `${room.metadata.name} brightness set to ${value}%`,
      });
      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set brightness",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleActivateScene = async (scene: Scene) => {
    try {
      await activateScene(scene.id);
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
      icon={archetypeIcon}
      title={room.metadata.name}
      subtitle={formatArchetype(room.metadata.archetype)}
      accessories={accessories}
      actions={
        <ActionPanel>
          {groupedLight && (
            <>
              <ActionPanel.Section>
                <Action
                  icon={isOn ? Icon.LightBulbOff : Icon.LightBulb}
                  title={isOn ? "Turn off All Lights" : "Turn on All Lights"}
                  onAction={handleToggle}
                />
              </ActionPanel.Section>

              {scenes.length > 0 && (
                <ActionPanel.Section title="Scenes">
                  <ActionPanel.Submenu title="Activate Scene" icon={Icon.Image}>
                    {scenes
                      .sort((a, b) => a.metadata.name.localeCompare(b.metadata.name))
                      .map((scene) => (
                        <Action
                          key={scene.id}
                          icon={Icon.Play}
                          title={scene.metadata.name}
                          onAction={() => handleActivateScene(scene)}
                        />
                      ))}
                  </ActionPanel.Submenu>
                </ActionPanel.Section>
              )}

              <ActionPanel.Section title="Brightness">
                <Action
                  icon={Icon.Sun}
                  title="Set to 100%"
                  shortcut={{ modifiers: ["cmd"], key: "1" }}
                  onAction={() => handleSetBrightness(100)}
                />
                <Action
                  icon={Icon.Sun}
                  title="Set to 75%"
                  shortcut={{ modifiers: ["cmd"], key: "2" }}
                  onAction={() => handleSetBrightness(75)}
                />
                <Action
                  icon={Icon.Sun}
                  title="Set to 50%"
                  shortcut={{ modifiers: ["cmd"], key: "3" }}
                  onAction={() => handleSetBrightness(50)}
                />
                <Action
                  icon={Icon.Sun}
                  title="Set to 25%"
                  shortcut={{ modifiers: ["cmd"], key: "4" }}
                  onAction={() => handleSetBrightness(25)}
                />
                <Action
                  icon={Icon.Sun}
                  title="Set to 10%"
                  shortcut={{ modifiers: ["cmd"], key: "5" }}
                  onAction={() => handleSetBrightness(10)}
                />
              </ActionPanel.Section>
            </>
          )}

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

function getArchetypeIcon(archetype: string): Icon {
  const iconMap: Record<string, Icon> = {
    living_room: Icon.House,
    kitchen: Icon.Mug,
    dining: Icon.Mug,
    bedroom: Icon.Moon,
    kids_bedroom: Icon.TwoPeople,
    bathroom: Icon.Droplets,
    office: Icon.Desktop,
    gym: Icon.Heartbeat,
    hallway: Icon.ArrowRight,
    garage: Icon.Car,
    garden: Icon.Tree,
    terrace: Icon.Sun,
    balcony: Icon.Sun,
    front_door: Icon.Key,
    staircase: Icon.ChevronUp,
    lounge: Icon.House,
    tv: Icon.Monitor,
    computer: Icon.Desktop,
    music: Icon.Music,
    reading: Icon.Book,
    closet: Icon.Box,
    storage: Icon.Box,
    laundry_room: Icon.Box,
    pool: Icon.Droplets,
  };

  return iconMap[archetype] ?? Icon.House;
}

function formatArchetype(archetype: string): string {
  return archetype
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
