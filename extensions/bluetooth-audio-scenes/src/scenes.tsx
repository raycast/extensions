import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  type LaunchProps,
  List,
  popToRoot,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { createDeeplink, useCachedPromise, useLocalStorage } from "@raycast/utils";
import { useEffect, useRef } from "react";
import {
  getCurrentOutputName,
  hasMatchingOutput,
  listInputDevices,
  listOutputDevices,
  setInputByName,
  setMuted,
  setOutputByName,
  setVolume,
} from "./lib/audio";
import {
  type BtDevice,
  connect,
  disconnect,
  isConnected,
  listPairedBluetoothDevices,
  waitForConnected,
} from "./lib/bluetooth";
import { MissingDependenciesView, requireBluetooth, useDependencyCheck } from "./lib/dependencies";
import { checkBluetoothDependency, openApp } from "./lib/exec";
import { LAST_USED_KEY, type LastUsedMap, OUTPUT_MAP_KEY, type OutputMap } from "./lib/storage";

interface Scene {
  id: string;
  name: string;
  audioOutput: string;
  // Bluetooth fields - optional for non-BT scenes
  bluetoothAddress?: string;
  bluetoothName?: string;
  // Optional settings
  lastUsed?: number;
  volume?: number; // 0-100, undefined = don't change
  muted?: boolean; // true/false, undefined = don't change
  inputDevice?: string; // undefined = don't change
  launchApp?: string; // App name to open, undefined = none
  icon?: string; // Icon name, default = "Bolt"
}

const STORAGE_KEY = "audio-scenes-v4";
const RESTORE_KEY = "scenes-restore-map";

type RestoreMap = Record<string, string>;

// Icon options for scene customization
const SCENE_ICONS: { name: string; icon: Icon }[] = [
  { name: "Bolt", icon: Icon.Bolt },
  { name: "Speaker", icon: Icon.Speaker },
  { name: "Headphones", icon: Icon.Headphones },
  { name: "Music", icon: Icon.Music },
  { name: "Microphone", icon: Icon.Microphone },
  { name: "Video", icon: Icon.Video },
  { name: "Gamepad", icon: Icon.GameController },
  { name: "Desktop", icon: Icon.Desktop },
  { name: "Moon", icon: Icon.Moon },
  { name: "Sun", icon: Icon.Sun },
  { name: "House", icon: Icon.House },
  { name: "Building", icon: Icon.Building },
  { name: "Car", icon: Icon.Car },
  { name: "Person", icon: Icon.Person },
  { name: "Star", icon: Icon.Star },
  { name: "Heart", icon: Icon.Heart },
];

function getSceneIcon(iconName?: string): Icon {
  const found = SCENE_ICONS.find((i) => i.name === iconName);
  return found?.icon ?? Icon.Bolt;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Parse combined volume dropdown value
function parseVolumeValue(value: string): { volume?: number; muted?: boolean } {
  if (value === "") {
    return {}; // Don't change
  }
  if (value === "muted") {
    return { muted: true };
  }
  return { volume: Number.parseInt(value, 10) };
}

// Format volume/muted for dropdown default value
function formatVolumeValue(volume?: number, muted?: boolean): string {
  if (muted === true) {
    return "muted";
  }
  if (volume !== undefined) {
    return volume.toString();
  }
  return "";
}

// Get volume accessory for scene list
function getVolumeAccessory(scene: Scene): { text: string; icon?: Icon }[] {
  if (scene.muted === true) {
    return [{ text: "Muted", icon: Icon.SpeakerOff }];
  }
  if (scene.volume !== undefined) {
    return [{ text: `${scene.volume}%` }];
  }
  return [];
}

interface LaunchContext {
  sceneId?: string;
}

export default function ScenesCommand(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const { data: missingDeps = [], isLoading: checkingDeps, revalidate: recheckDeps } = useDependencyCheck();

  const { value: scenes = [], setValue: setScenes, isLoading } = useLocalStorage<Scene[]>(STORAGE_KEY, []);
  const { value: restoreMap = {}, setValue: setRestoreMap } = useLocalStorage<RestoreMap>(RESTORE_KEY, {});
  const { value: outputMap = {}, setValue: setOutputMap } = useLocalStorage<OutputMap>(OUTPUT_MAP_KEY, {});
  const { value: lastUsedMap = {}, setValue: setLastUsedMap } = useLocalStorage<LastUsedMap>(LAST_USED_KEY, {});
  const { push } = useNavigation();

  // Track if we've handled the deeplink to avoid running twice
  const deeplinkHandled = useRef(false);

  // Handle deeplink launch - run scene immediately and close
  useEffect(() => {
    const sceneId = props.launchContext?.sceneId;
    if (!sceneId || isLoading || deeplinkHandled.current) {
      return;
    }

    const scene = scenes?.find((s) => s.id === sceneId);
    if (!scene) {
      showHUD("Scene not found");
      popToRoot();
      return;
    }

    deeplinkHandled.current = true;
    runSceneFromDeeplink(scene);
  }, [props.launchContext?.sceneId, scenes, isLoading]);

  // Run scene from deeplink - uses HUD and closes after
  async function runSceneFromDeeplink(scene: Scene) {
    try {
      // Check blueutil availability if this scene uses Bluetooth
      if (scene.bluetoothAddress && !(await requireBluetooth())) {
        popToRoot();
        return;
      }

      // Save current output for restore
      const current = await getCurrentOutputName();
      await setRestoreMap({ ...restoreMap, [scene.id]: current });

      // Connect Bluetooth device (if this is a BT scene)
      if (scene.bluetoothAddress) {
        await connect(scene.bluetoothAddress);
        await waitForConnected(scene.bluetoothAddress, 12_000);
      }

      // Set audio output
      await setOutputByName(scene.audioOutput);

      // Set volume if specified (auto-unmutes)
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
      const newLastUsed: LastUsedMap = {
        ...lastUsedMap,
        [`scene:${scene.id}`]: Date.now(),
      };
      if (scene.bluetoothAddress) {
        newLastUsed[scene.bluetoothAddress] = Date.now();
      }
      await setLastUsedMap(newLastUsed);

      await showHUD(`▶ ${scene.name}`);
    } catch (e) {
      await showHUD(`✗ ${scene.name}: ${e instanceof Error ? e.message : "Failed"}`);
    }
    popToRoot();
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Scene logic requires multiple conditional steps
  async function runScene(scene: Scene) {
    // Check blueutil availability if this scene uses Bluetooth
    if (scene.bluetoothAddress && !(await requireBluetooth())) {
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: `Running: ${scene.name}`,
    });

    try {
      // Save current output for restore
      const current = await getCurrentOutputName();
      await setRestoreMap({ ...restoreMap, [scene.id]: current });

      // Connect Bluetooth device (if this is a BT scene)
      if (scene.bluetoothAddress) {
        await connect(scene.bluetoothAddress);
        await waitForConnected(scene.bluetoothAddress, 12_000);
      }

      // Set audio output
      await setOutputByName(scene.audioOutput);

      // Set volume if specified (auto-unmutes)
      if (scene.volume !== undefined) {
        await setVolume(scene.volume);
        await setMuted(false); // Unmute when setting volume
      } else if (scene.muted !== undefined) {
        // Only apply mute setting if no volume specified
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

      // Save to shared mapping for BT devices
      if (scene.bluetoothAddress && outputMap[scene.bluetoothAddress] !== scene.audioOutput) {
        await setOutputMap({
          ...outputMap,
          [scene.bluetoothAddress]: scene.audioOutput,
        });
      }

      // Mark scene as recently used (and BT device if applicable)
      const newLastUsed: LastUsedMap = {
        ...lastUsedMap,
        [`scene:${scene.id}`]: Date.now(),
      };
      if (scene.bluetoothAddress) {
        newLastUsed[scene.bluetoothAddress] = Date.now();
      }
      await setLastUsedMap(newLastUsed);

      await showToast({
        style: Toast.Style.Success,
        title: `${scene.name}: ${scene.audioOutput}`,
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed: ${scene.name}`,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Toggle logic requires handling both BT and non-BT scenarios
  async function toggleScene(scene: Scene) {
    // For Bluetooth scenes, check connection status
    if (scene.bluetoothAddress) {
      // Check blueutil availability
      if (!(await requireBluetooth())) {
        return;
      }

      const connected = await isConnected(scene.bluetoothAddress);

      if (connected) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Stopping: ${scene.name}`,
        });
        await disconnect(scene.bluetoothAddress);

        const restore = restoreMap[scene.id];
        if (restore) {
          await setOutputByName(restore).catch(() => {
            // ignore - best effort
          });
        }

        await showToast({
          style: Toast.Style.Success,
          title: `Stopped: ${scene.name}`,
        });
        return;
      }
    } else {
      // For non-BT scenes, check if current output matches scene
      const current = await getCurrentOutputName();
      if (current === scene.audioOutput) {
        // Restore previous output
        const restore = restoreMap[scene.id];
        if (restore && restore !== scene.audioOutput) {
          await showToast({
            style: Toast.Style.Animated,
            title: "Restoring previous output",
          });
          try {
            await setOutputByName(restore);
            await showToast({
              style: Toast.Style.Success,
              title: `Output: ${restore}`,
            });
          } catch (e) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to restore output",
              message: e instanceof Error ? e.message : String(e),
            });
          }
          return;
        }
      }
    }

    await runScene(scene);
  }

  async function removeScene(id: string) {
    await setScenes((scenes ?? []).filter((s) => s.id !== id));
    await showToast({ style: Toast.Style.Success, title: "Scene deleted" });
  }

  function startCreateScene() {
    push(
      <DevicePicker
        lastUsedMap={lastUsedMap}
        outputMap={outputMap}
        scenes={scenes ?? []}
        setOutputMap={setOutputMap}
        setScenes={setScenes}
      />,
    );
  }

  async function copyDeeplink(scene: Scene) {
    const deeplink = createDeeplink({
      command: "scenes",
      context: { sceneId: scene.id },
    });
    await Clipboard.copy(deeplink);
    await showHUD("Deeplink copied - paste in Raycast to create Quicklink");
  }

  if (!checkingDeps && missingDeps.length > 0) {
    return <MissingDependenciesView missing={missingDeps} onRecheck={recheckDeps} />;
  }

  return (
    <List isLoading={isLoading || checkingDeps} searchBarPlaceholder="Search scenes...">
      <List.EmptyView
        actions={
          <ActionPanel>
            <Action icon={Icon.Plus} onAction={startCreateScene} title="Create Scene" />
          </ActionPanel>
        }
        description="Create scenes to switch audio outputs instantly. You can assign keyboard shortcuts to each scene."
        icon={Icon.Speaker}
        title="No scenes yet"
      />

      <List.Item
        actions={
          <ActionPanel>
            <Action icon={Icon.Plus} onAction={startCreateScene} title="Create Scene" />
          </ActionPanel>
        }
        icon={Icon.PlusCircle}
        key="__create__"
        title="Create New Scene..."
      />

      <List.Section subtitle="Cmd+Shift+C to copy hotkey link" title="Scenes">
        {[...(scenes ?? [])]
          .sort((a, b) => (lastUsedMap[`scene:${b.id}`] ?? 0) - (lastUsedMap[`scene:${a.id}`] ?? 0))
          .map((s) => (
            <List.Item
              accessories={[...getVolumeAccessory(s), { text: s.audioOutput, icon: Icon.Speaker }]}
              actions={
                <ActionPanel>
                  <Action icon={Icon.Play} onAction={() => runScene(s)} title="Run Scene" />
                  {s.bluetoothAddress && (
                    <Action icon={Icon.Eject} onAction={() => toggleScene(s)} title="Connect / Disconnect" />
                  )}
                  <Action
                    icon={Icon.Pencil}
                    onAction={() => push(<EditSceneForm scene={s} scenes={scenes ?? []} setScenes={setScenes} />)}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    title="Edit Scene"
                  />
                  <Action
                    icon={Icon.Link}
                    onAction={() => copyDeeplink(s)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    title="Copy Hotkey Link"
                  />
                  <Action icon={Icon.Plus} onAction={startCreateScene} title="Create Scene" />
                  <Action
                    icon={Icon.Trash}
                    onAction={() => removeScene(s.id)}
                    style={Action.Style.Destructive}
                    title="Delete Scene"
                  />
                </ActionPanel>
              }
              icon={getSceneIcon(s.icon)}
              key={s.id}
              subtitle={s.bluetoothName ?? "Output only"}
              title={s.name}
            />
          ))}
      </List.Section>
    </List>
  );
}

function DevicePicker(props: {
  scenes: Scene[];
  setScenes: (scenes: Scene[]) => Promise<void>;
  outputMap: OutputMap;
  setOutputMap: (map: OutputMap) => Promise<void>;
  lastUsedMap: LastUsedMap;
}) {
  const { push } = useNavigation();

  const { data: { devices, audioOutputs } = { devices: [], audioOutputs: [] }, isLoading } = useCachedPromise(
    async (lastUsed: LastUsedMap) => {
      // Check if blueutil is available before trying to list BT devices
      const hasBluetooth = await checkBluetoothDependency();

      const [paired, outputs] = await Promise.all([
        hasBluetooth ? listPairedBluetoothDevices(false) : Promise.resolve([]),
        listOutputDevices(),
      ]);

      // Deduplicate devices by address (blueutil can return duplicates)
      const uniquePaired = paired.filter(
        (device, index, self) => index === self.findIndex((d) => d.address === device.address),
      );

      // Sort by last used
      const sorted = [...uniquePaired].sort((a, b) => (lastUsed[b.address] ?? 0) - (lastUsed[a.address] ?? 0));
      return { devices: sorted, audioOutputs: outputs };
    },
    [props.lastUsedMap],
  );

  function selectDevice(device: BtDevice) {
    // Check if we already have a mapping for this device
    const existingOutput = props.outputMap[device.address];

    if (existingOutput) {
      // Skip output picker, go straight to name form
      push(
        <SceneNameForm
          audioOutput={existingOutput}
          device={device}
          outputMap={props.outputMap}
          scenes={props.scenes}
          setOutputMap={props.setOutputMap}
          setScenes={props.setScenes}
          skipSteps={1}
        />,
      );
    } else {
      // Show output picker
      push(
        <OutputPicker
          device={device}
          outputMap={props.outputMap}
          scenes={props.scenes}
          setOutputMap={props.setOutputMap}
          setScenes={props.setScenes}
        />,
      );
    }
  }

  function selectOutputOnly(outputName: string) {
    // Go directly to scene name form with just the output (no BT device)
    push(
      <SceneNameForm
        audioOutput={outputName}
        outputMap={props.outputMap}
        scenes={props.scenes}
        setOutputMap={props.setOutputMap}
        setScenes={props.setScenes}
        skipSteps={1}
      />,
    );
  }

  // Get non-Bluetooth outputs
  const getNonBluetoothOutputs = () => {
    const btOutputNames = new Set(Object.values(props.outputMap));
    const btDeviceNames = devices.map((d) => d.name.toLowerCase());

    return audioOutputs.filter((o) => {
      if (btOutputNames.has(o.name)) {
        return false;
      }
      const nameLower = o.name.toLowerCase();
      return !btDeviceNames.some((btName) => nameLower.includes(btName) || btName.includes(nameLower));
    });
  };

  // Split BT devices into audio and other
  const btAudioDevices = devices.filter((d) => props.outputMap[d.address] || hasMatchingOutput(d.name, audioOutputs));
  const btOtherDevices = devices.filter(
    (d) => !(props.outputMap[d.address] || hasMatchingOutput(d.name, audioOutputs)),
  );
  const otherOutputs = getNonBluetoothOutputs();

  const renderDevice = (d: BtDevice) => {
    const existingOutput = props.outputMap[d.address];
    return (
      <List.Item
        accessories={existingOutput ? [{ text: `→ ${existingOutput}`, icon: Icon.Speaker }] : []}
        actions={
          <ActionPanel>
            <Action icon={Icon.Bluetooth} onAction={() => selectDevice(d)} title="Select Device" />
          </ActionPanel>
        }
        icon={Icon.Bluetooth}
        key={d.address}
        subtitle={existingOutput ? "Output remembered" : d.address}
        title={d.name}
      />
    );
  };

  const renderOutput = (o: { name: string }) => (
    <List.Item
      actions={
        <ActionPanel>
          <Action icon={Icon.Speaker} onAction={() => selectOutputOnly(o.name)} title="Select Output" />
        </ActionPanel>
      }
      icon={Icon.Speaker}
      key={o.name}
      title={o.name}
    />
  );

  return (
    <List isLoading={isLoading} navigationTitle="Select Device or Output" searchBarPlaceholder="Search devices...">
      {btAudioDevices.length > 0 && (
        <List.Section title="Bluetooth Audio">{btAudioDevices.map(renderDevice)}</List.Section>
      )}
      {otherOutputs.length > 0 && <List.Section title="Other Outputs">{otherOutputs.map(renderOutput)}</List.Section>}
      {btOtherDevices.length > 0 && (
        <List.Section title="Other Bluetooth">{btOtherDevices.map(renderDevice)}</List.Section>
      )}
    </List>
  );
}

function OutputPicker(props: {
  device: BtDevice;
  scenes: Scene[];
  setScenes: (scenes: Scene[]) => Promise<void>;
  outputMap: OutputMap;
  setOutputMap: (map: OutputMap) => Promise<void>;
}) {
  const { push } = useNavigation();

  const { data: outputs = [], isLoading } = useCachedPromise(async () => {
    return await listOutputDevices();
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle="Select Audio Output" searchBarPlaceholder="Search audio outputs...">
      {outputs.map((o) => (
        <List.Item
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Speaker}
                onAction={() => {
                  push(
                    <SceneNameForm
                      audioOutput={o.name}
                      device={props.device}
                      outputMap={props.outputMap}
                      scenes={props.scenes}
                      setOutputMap={props.setOutputMap}
                      setScenes={props.setScenes}
                      skipSteps={0}
                    />,
                  );
                }}
                title="Select Output"
              />
            </ActionPanel>
          }
          icon={Icon.Speaker}
          key={o.name}
          title={o.name}
        />
      ))}
    </List>
  );
}

function SceneNameForm(props: {
  device?: BtDevice; // Optional - not provided for non-BT scenes
  audioOutput: string;
  scenes: Scene[];
  setScenes: (scenes: Scene[]) => Promise<void>;
  outputMap: OutputMap;
  setOutputMap: (map: OutputMap) => Promise<void>;
  skipSteps: number; // How many steps were skipped (for correct pop count)
}) {
  const { pop } = useNavigation();

  const { data: inputDevices = [], isLoading } = useCachedPromise(async () => listInputDevices(), []);

  const defaultName = props.device?.name ?? props.audioOutput;
  const descriptionText = props.device ? `${props.device.name} → ${props.audioOutput}` : props.audioOutput;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Check}
            onSubmit={async (values) => {
              const { volume, muted } = parseVolumeValue(values.volume);
              const newScene: Scene = {
                id: uid(),
                name: String(values.name),
                audioOutput: props.audioOutput,
                icon: values.icon || "Bolt",
                volume,
                muted,
                inputDevice: values.inputDevice || undefined,
                launchApp: values.launchApp || undefined,
                // Only include BT fields if device provided
                ...(props.device && {
                  bluetoothAddress: props.device.address,
                  bluetoothName: props.device.name,
                }),
              };
              await props.setScenes([newScene, ...props.scenes]);

              // Save to shared mapping (only for BT devices)
              if (props.device) {
                await props.setOutputMap({
                  ...props.outputMap,
                  [props.device.address]: props.audioOutput,
                });
              }

              await showToast({
                style: Toast.Style.Success,
                title: "Scene created",
              });

              // Pop back to scenes list (2 or 3 pops depending on whether output picker was shown)
              const pops = 3 - props.skipSteps;
              for (let i = 0; i < pops; i++) {
                pop();
              }
            }}
            title="Create Scene"
          />
        </ActionPanel>
      }
      isLoading={isLoading}
      navigationTitle="Configure Scene"
    >
      <Form.TextField
        autoFocus
        defaultValue={defaultName}
        id="name"
        placeholder="Living Room Speaker"
        title="Scene Name"
      />

      <Form.Dropdown defaultValue="Bolt" id="icon" title="Icon">
        {SCENE_ICONS.map((i) => (
          <Form.Dropdown.Item icon={i.icon} key={i.name} title={i.name} value={i.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text={descriptionText} title="Audio Output" />

      <Form.Dropdown defaultValue="" id="volume" title="Volume">
        <Form.Dropdown.Item title="Don't change" value="" />
        <Form.Dropdown.Item icon={Icon.SpeakerOff} title="Muted" value="muted" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="10%" value="10" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="20%" value="20" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="30%" value="30" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="40%" value="40" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="50%" value="50" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="60%" value="60" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="70%" value="70" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="80%" value="80" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="90%" value="90" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="100%" value="100" />
      </Form.Dropdown>

      <Form.Dropdown defaultValue="" id="inputDevice" title="Input Device">
        <Form.Dropdown.Item title="Don't change" value="" />
        {inputDevices.map((d) => (
          <Form.Dropdown.Item icon={Icon.Microphone} key={d.name} title={d.name} value={d.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField id="launchApp" info="App name (e.g., Spotify, Music)" placeholder="App name" title="Launch App" />
    </Form>
  );
}

function EditSceneForm(props: { scene: Scene; scenes: Scene[]; setScenes: (scenes: Scene[]) => Promise<void> }) {
  const { pop } = useNavigation();

  const { data: inputDevices = [], isLoading } = useCachedPromise(async () => listInputDevices(), []);

  const volumeDefault = formatVolumeValue(props.scene.volume, props.scene.muted);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Check}
            onSubmit={async (values) => {
              const { volume, muted } = parseVolumeValue(values.volume);
              const updatedScene: Scene = {
                ...props.scene,
                name: String(values.name),
                icon: values.icon || "Bolt",
                volume,
                muted,
                inputDevice: values.inputDevice || undefined,
                launchApp: values.launchApp || undefined,
              };

              await props.setScenes(props.scenes.map((s) => (s.id === props.scene.id ? updatedScene : s)));

              await showToast({
                style: Toast.Style.Success,
                title: "Scene updated",
              });

              pop();
            }}
            title="Save Changes"
          />
        </ActionPanel>
      }
      isLoading={isLoading}
      navigationTitle="Edit Scene"
    >
      <Form.TextField
        autoFocus
        defaultValue={props.scene.name}
        id="name"
        placeholder="Living Room Speaker"
        title="Scene Name"
      />

      <Form.Dropdown defaultValue={props.scene.icon ?? "Bolt"} id="icon" title="Icon">
        {SCENE_ICONS.map((i) => (
          <Form.Dropdown.Item icon={i.icon} key={i.name} title={i.name} value={i.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description
        text={
          props.scene.bluetoothName
            ? `${props.scene.bluetoothName} → ${props.scene.audioOutput}`
            : props.scene.audioOutput
        }
        title="Audio Output"
      />

      <Form.Dropdown defaultValue={volumeDefault} id="volume" title="Volume">
        <Form.Dropdown.Item title="Don't change" value="" />
        <Form.Dropdown.Item icon={Icon.SpeakerOff} title="Muted" value="muted" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="10%" value="10" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="20%" value="20" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="30%" value="30" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="40%" value="40" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="50%" value="50" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="60%" value="60" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="70%" value="70" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="80%" value="80" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="90%" value="90" />
        <Form.Dropdown.Item icon={Icon.Speaker} title="100%" value="100" />
      </Form.Dropdown>

      <Form.Dropdown defaultValue={props.scene.inputDevice ?? ""} id="inputDevice" title="Input Device">
        <Form.Dropdown.Item title="Don't change" value="" />
        {inputDevices.map((d) => (
          <Form.Dropdown.Item icon={Icon.Microphone} key={d.name} title={d.name} value={d.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        defaultValue={props.scene.launchApp ?? ""}
        id="launchApp"
        info="App name (e.g., Spotify, Music)"
        placeholder="App name"
        title="Launch App"
      />
    </Form>
  );
}
