import { List, ActionPanel, Action, Icon, showToast, Toast, Color, openExtensionPreferences } from "@raycast/api";
import { useLightsWithRooms, findRoomForLight } from "./hooks/useHue";
import { toggleLight, setLightBrightness, setLightColorTemperature, setLightColor } from "./api/lights";
import type { LightGet as Light, RoomGet as Room } from "./api/generated/src/models";
import { getCredentials } from "./api/client";
import { xyToHex, mirekToHex, hexToXY, PRESET_COLORS, PRESET_TEMPERATURES } from "./utils/color";

function formatArchetype(archetype: string): string {
  return archetype
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function LightsCommand() {
  const credentials = getCredentials();

  if (!credentials) {
    return <NoBridgeConfigured />;
  }

  return <LightsList />;
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

function LightsList() {
  const { lights, rooms, isLoading, error, revalidate } = useLightsWithRooms();

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load lights",
      message: error.message,
    });
  }

  const getRoomName = (room?: Room) => room?.metadata?.name ?? "Unassigned";

  // Group lights by room
  const lightsByRoom = new Map<string, { room: Room | undefined; lights: Light[] }>();

  for (const light of lights) {
    const room = findRoomForLight(light, rooms);
    const roomKey = room?.id ?? "unassigned";

    if (!lightsByRoom.has(roomKey)) {
      lightsByRoom.set(roomKey, { room, lights: [] });
    }
    lightsByRoom.get(roomKey)!.lights.push(light);
  }

  // Sort rooms by name, with unassigned at the end
  const sortedRooms = Array.from(lightsByRoom.entries()).sort((a, b) => {
    if (a[0] === "unassigned") return 1;
    if (b[0] === "unassigned") return -1;
    const nameA = getRoomName(a[1].room) ?? "";
    const nameB = getRoomName(b[1].room) ?? "";
    return nameA.localeCompare(nameB);
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search lights...">
      {sortedRooms.map(([roomKey, { room, lights: roomLights }]) => (
        <List.Section key={roomKey} title={getRoomName(room)} subtitle={`${roomLights.length} lights`}>
          {roomLights.map((light) => (
            <LightListItem key={light.id} light={light} roomName={getRoomName(room)} revalidate={revalidate} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function LightListItem({
  light,
  roomName,
  revalidate,
}: {
  light: Light;
  roomName: string;
  revalidate: () => Promise<void>;
}) {
  const isOn = light.on?.on ?? false;
  const brightness = light.dimming?.brightness ?? 100;
  const lightName = light.metadata?.name ?? "Unknown Light";
  const lightArchetype = light.metadata?.archetype ?? "unknown";

  // Determine light color for icon
  let iconTintColor: string | undefined;
  if (light.color?.xy?.x !== undefined && light.color?.xy?.y !== undefined) {
    iconTintColor = xyToHex(light.color.xy.x, light.color.xy.y, brightness);
  } else if (light.color_temperature?.mirek) {
    iconTintColor = mirekToHex(light.color_temperature.mirek);
  }

  const accessories: List.Item.Accessory[] = [];

  if (light.dimming) {
    accessories.push({ text: `${Math.round(brightness)}%` });
  }

  accessories.push({
    icon: isOn
      ? { source: Icon.Circle, tintColor: Color.Green }
      : { source: Icon.CircleDisabled, tintColor: Color.SecondaryText },
    tooltip: isOn ? "On" : "Off",
  });

  const handleToggle = async () => {
    try {
      await toggleLight(light.id!, !isOn);
      await showToast({
        style: Toast.Style.Success,
        title: `${lightName} turned ${isOn ? "off" : "on"}`,
      });
      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle light",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleSetBrightness = async (value: number) => {
    try {
      await setLightBrightness(light.id!, value);
      await showToast({
        style: Toast.Style.Success,
        title: `${lightName} brightness set to ${value}%`,
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

  const handleSetColor = async (hex: string) => {
    try {
      const xy = hexToXY(hex);
      await setLightColor(light.id!, xy.x, xy.y);
      await showToast({
        style: Toast.Style.Success,
        title: `${lightName} color updated`,
      });
      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set color",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleSetTemperature = async (mirek: number) => {
    try {
      await setLightColorTemperature(light.id!, mirek);
      await showToast({
        style: Toast.Style.Success,
        title: `${lightName} temperature updated`,
      });
      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set temperature",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List.Item
      icon={iconTintColor ? { source: Icon.LightBulb, tintColor: iconTintColor } : Icon.LightBulb}
      title={lightName}
      subtitle={`${roomName} • ${formatArchetype(lightArchetype)}`}
      keywords={[roomName]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              icon={isOn ? Icon.LightBulbOff : Icon.LightBulb}
              title={isOn ? "Turn off" : "Turn on"}
              onAction={handleToggle}
            />
          </ActionPanel.Section>

          {light.dimming && (
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
          )}

          {light.color && (
            <ActionPanel.Section title="Colors">
              {PRESET_COLORS.map((preset) => (
                <Action
                  key={preset.name}
                  icon={{ source: Icon.Circle, tintColor: preset.hex }}
                  title={preset.name}
                  onAction={() => handleSetColor(preset.hex)}
                />
              ))}
            </ActionPanel.Section>
          )}

          {light.color_temperature && (
            <ActionPanel.Section title="Color Temperature">
              {PRESET_TEMPERATURES.map((preset) => (
                <Action
                  key={preset.name}
                  icon={Icon.Temperature}
                  title={preset.name}
                  onAction={() => handleSetTemperature(preset.mirek)}
                />
              ))}
            </ActionPanel.Section>
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
