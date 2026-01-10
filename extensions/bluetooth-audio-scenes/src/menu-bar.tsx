import { Icon, launchCommand, LaunchType, MenuBarExtra, showHUD } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { setInputByName, setMuted, setOutputByName, setVolume } from "./lib/audio";
import { connect, waitForConnected } from "./lib/bluetooth";
import { checkBluetoothDependency, openApp } from "./lib/exec";
import { LAST_USED_KEY, type LastUsedMap } from "./lib/storage";

interface Scene {
  id: string;
  name: string;
  audioOutput: string;
  bluetoothAddress?: string;
  bluetoothName?: string;
  volume?: number;
  muted?: boolean;
  inputDevice?: string;
  launchApp?: string;
  icon?: string;
}

const STORAGE_KEY = "audio-scenes-v4";

const ICON_MAP: Record<string, Icon> = {
  Bolt: Icon.Bolt,
  Speaker: Icon.Speaker,
  Headphones: Icon.Headphones,
  Music: Icon.Music,
  Microphone: Icon.Microphone,
  Video: Icon.Video,
  Gamepad: Icon.GameController,
  Desktop: Icon.Desktop,
  Moon: Icon.Moon,
  Sun: Icon.Sun,
  House: Icon.House,
  Building: Icon.Building,
  Car: Icon.Car,
  Person: Icon.Person,
  Star: Icon.Star,
  Heart: Icon.Heart,
};

function getSceneIcon(iconName?: string): Icon {
  return ICON_MAP[iconName ?? ""] ?? Icon.Bolt;
}

export default function MenuBarCommand() {
  const { value: scenes = [], isLoading } = useLocalStorage<Scene[]>(STORAGE_KEY, []);
  const { value: lastUsedMap = {}, setValue: setLastUsedMap } = useLocalStorage<LastUsedMap>(LAST_USED_KEY, {});

  // Sort scenes by last used
  const sortedScenes = [...scenes].sort(
    (a, b) => (lastUsedMap[`scene:${b.id}`] ?? 0) - (lastUsedMap[`scene:${a.id}`] ?? 0),
  );

  async function runScene(scene: Scene) {
    // Check blueutil availability if this scene uses Bluetooth
    if (scene.bluetoothAddress) {
      const hasBluetooth = await checkBluetoothDependency();
      if (!hasBluetooth) {
        await showHUD("blueutil not installed - run: brew install blueutil");
        return;
      }
    }

    try {
      // Connect Bluetooth device if needed
      if (scene.bluetoothAddress) {
        await connect(scene.bluetoothAddress);
        await waitForConnected(scene.bluetoothAddress, 12_000);
      }

      // Set audio output
      await setOutputByName(scene.audioOutput);

      // Set volume if specified
      if (scene.volume !== undefined) {
        await setVolume(scene.volume);
        await setMuted(false);
      } else if (scene.muted !== undefined) {
        await setMuted(scene.muted);
      }

      // Set input device if specified
      if (scene.inputDevice) {
        await setInputByName(scene.inputDevice);
      }

      // Launch app if specified
      if (scene.launchApp) {
        await openApp(scene.launchApp);
      }

      // Update last used
      await setLastUsedMap({
        ...lastUsedMap,
        [`scene:${scene.id}`]: Date.now(),
        ...(scene.bluetoothAddress ? { [scene.bluetoothAddress]: Date.now() } : {}),
      });

      await showHUD(`▶ ${scene.name}`);
    } catch (e) {
      await showHUD(`✗ ${scene.name}: ${e instanceof Error ? e.message : "Failed"}`);
    }
  }

  if (scenes.length === 0 && !isLoading) {
    return (
      <MenuBarExtra icon="menubar-icon.svg" tooltip="AudioScenes">
        <MenuBarExtra.Item
          title="No scenes yet"
          icon={Icon.Plus}
          onAction={() => launchCommand({ name: "scenes", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Create a Scene..."
          onAction={() => launchCommand({ name: "scenes", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra icon="menubar-icon.svg" isLoading={isLoading} tooltip="AudioScenes">
      <MenuBarExtra.Section title="Scenes">
        {sortedScenes.map((scene) => (
          <MenuBarExtra.Item
            key={scene.id}
            icon={getSceneIcon(scene.icon)}
            title={scene.name}
            subtitle={scene.audioOutput}
            onAction={() => runScene(scene)}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Manage Scenes..."
          icon={Icon.Gear}
          onAction={() => launchCommand({ name: "scenes", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Connect Device..."
          icon={Icon.Link}
          onAction={() => launchCommand({ name: "devices", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
