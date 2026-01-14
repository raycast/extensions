import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { loadDevices } from "./device-storage";
import { WLEDClient, WLEDDevice } from "./wled-api";
import { loadScenes, WLEDScene, deleteScene, updateScene, DeviceState } from "./scene-storage";
import { CreateSceneForm } from "./create-scene";

const PINNED_SCENES_KEY = "pinnedScenes";

export default function SetScene() {
  const [devices, setDevices] = useState<WLEDDevice[]>([]);
  const [scenes, setScenes] = useState<WLEDScene[]>([]);
  const [pinnedSceneIds, setPinnedSceneIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    const [loadedDevices, loadedScenes, storedPinned] = await Promise.all([
      loadDevices(),
      loadScenes(),
      LocalStorage.getItem<string>(PINNED_SCENES_KEY),
    ]);
    setDevices(loadedDevices);
    setScenes(loadedScenes);
    setPinnedSceneIds(storedPinned ? JSON.parse(storedPinned) : []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function applyScene(scene: WLEDScene) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Applying Scene",
      message: `Activating ${scene.deviceStates.length} device${scene.deviceStates.length !== 1 ? "s" : ""}...`,
    });

    try {
      // Apply state to all devices in parallel
      const results = await Promise.allSettled(
        scene.deviceStates.map(async (deviceState) => {
          // Find the device by IP
          const device = devices.find((d) => d.ip === deviceState.deviceIp);
          if (!device) {
            throw new Error(`Device ${deviceState.deviceName} (${deviceState.deviceIp}) not found`);
          }

          const client = new WLEDClient(device);

          // Build state object from device state
          const state: Partial<{
            on: boolean;
            bri: number;
            seg: Array<{
              id: number;
              col?: number[][];
              fx?: number;
              sx?: number;
              ix?: number;
              pal?: number;
            }>;
          }> = {
            on: deviceState.power,
            bri: deviceState.brightness,
          };

          // Add segment configuration if any segment properties are defined
          if (
            deviceState.color ||
            deviceState.effectId !== undefined ||
            deviceState.effectSpeed !== undefined ||
            deviceState.effectIntensity !== undefined ||
            deviceState.paletteId !== undefined
          ) {
            state.seg = [
              {
                id: 0,
                ...(deviceState.color && { col: [deviceState.color] }),
                ...(deviceState.effectId !== undefined && { fx: deviceState.effectId }),
                ...(deviceState.effectSpeed !== undefined && { sx: deviceState.effectSpeed }),
                ...(deviceState.effectIntensity !== undefined && { ix: deviceState.effectIntensity }),
                ...(deviceState.paletteId !== undefined && { pal: deviceState.paletteId }),
              },
            ];
          }

          await client.setState(state);
          return deviceState.deviceName;
        }),
      );

      // Count successes and failures
      const successes = results.filter((r) => r.status === "fulfilled");
      const failures = results.filter((r) => r.status === "rejected");

      if (failures.length === 0) {
        toast.style = Toast.Style.Success;
        toast.title = "Scene Applied";
        toast.message = `"${scene.name}" applied to ${successes.length} device${successes.length !== 1 ? "s" : ""}`;
      } else if (successes.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to Apply Scene";
        toast.message = `All ${failures.length} device${failures.length !== 1 ? "s" : ""} failed`;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Scene Partially Applied";
        toast.message = `${successes.length} succeeded, ${failures.length} failed`;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Apply Scene";
      toast.message = String(error);
    }
  }

  async function onPin(scene: WLEDScene) {
    const isPinned = pinnedSceneIds.includes(scene.id);
    let newPinnedIds: string[];

    if (isPinned) {
      newPinnedIds = pinnedSceneIds.filter((id) => id !== scene.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Scene Unpinned",
        message: `"${scene.name}" has been unpinned`,
      });
    } else {
      newPinnedIds = [...pinnedSceneIds, scene.id];
      await showToast({
        style: Toast.Style.Success,
        title: "Scene Pinned",
        message: `"${scene.name}" has been pinned`,
      });
    }

    setPinnedSceneIds(newPinnedIds);
    await LocalStorage.setItem(PINNED_SCENES_KEY, JSON.stringify(newPinnedIds));
  }

  async function onRearrange(scene: WLEDScene, direction: "up" | "down") {
    const sceneIndex = pinnedSceneIds.findIndex((id) => id === scene.id);
    const newPinnedIds = [...pinnedSceneIds];

    if (direction === "up") {
      newPinnedIds[sceneIndex] = newPinnedIds[sceneIndex - 1];
      newPinnedIds[sceneIndex - 1] = scene.id;
      await showToast({
        style: Toast.Style.Success,
        title: "Scene Moved Up",
        message: `"${scene.name}" moved up`,
      });
    } else {
      newPinnedIds[sceneIndex] = newPinnedIds[sceneIndex + 1];
      newPinnedIds[sceneIndex + 1] = scene.id;
      await showToast({
        style: Toast.Style.Success,
        title: "Scene Moved Down",
        message: `"${scene.name}" moved down`,
      });
    }

    setPinnedSceneIds(newPinnedIds);
    await LocalStorage.setItem(PINNED_SCENES_KEY, JSON.stringify(newPinnedIds));
  }

  function getValidRearrangeDirections(scene: WLEDScene) {
    const index = pinnedSceneIds.findIndex((id) => id === scene.id);
    return {
      up: index > 0,
      down: index < pinnedSceneIds.length - 1,
    };
  }

  async function handleDeleteScene(scene: WLEDScene) {
    const confirmed = await confirmAlert({
      title: "Delete Scene",
      message: `Are you sure you want to delete "${scene.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });

    if (confirmed) {
      try {
        await deleteScene(scene.id);
        setScenes(scenes.filter((s) => s.id !== scene.id));

        // Remove from pinned list if pinned
        if (pinnedSceneIds.includes(scene.id)) {
          const newPinnedIds = pinnedSceneIds.filter((id) => id !== scene.id);
          setPinnedSceneIds(newPinnedIds);
          await LocalStorage.setItem(PINNED_SCENES_KEY, JSON.stringify(newPinnedIds));
        }

        await showToast({
          style: Toast.Style.Success,
          title: "Scene Deleted",
          message: `"${scene.name}" has been deleted`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete Scene",
          message: String(error),
        });
      }
    }
  }

  if (scenes.length === 0) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={{ source: Icon.Stars, tintColor: Color.Purple }}
          title="No Scenes"
          description="Create your first scene to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Scene"
                icon={Icon.Plus}
                target={<CreateSceneForm devices={devices} onUpdate={loadData} />}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Create pinned and unpinned scenes arrays
  const pinnedScenes = pinnedSceneIds
    .map((id) => scenes.find((scene) => scene.id === id))
    .filter((scene): scene is WLEDScene => scene !== undefined);

  const unpinnedScenes = scenes.filter((scene) => !pinnedSceneIds.includes(scene.id));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search scenes...">
      {/* Pinned Scenes Section */}
      <List.Section title="Pinned Scenes">
        {pinnedScenes.map((scene) => {
          const deviceCount = scene.deviceStates.length;
          const deviceNames = scene.deviceStates.map((ds) => ds.deviceName).join(", ");
          const validDirections = getValidRearrangeDirections(scene);

          return (
            <List.Item
              key={scene.id}
              title={scene.name}
              subtitle={scene.description}
              icon={{ source: Icon.Stars, tintColor: Color.Purple }}
              accessories={[
                {
                  text: `${deviceCount} device${deviceCount !== 1 ? "s" : ""}`,
                  tooltip: deviceNames,
                  icon: Icon.LightBulb,
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Apply Scene"
                      icon={{ source: Icon.Play, tintColor: Color.Green }}
                      onAction={() => applyScene(scene)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action
                      title="Unpin Scene"
                      icon={Icon.PinDisabled}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "p" },
                        Windows: { modifiers: ["ctrl"], key: "." },
                      }}
                      onAction={() => onPin(scene)}
                    />
                    {validDirections.up && (
                      <Action
                        title="Move up in Pinned"
                        icon={Icon.ArrowUp}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "opt"], key: "arrowUp" },
                          Windows: { modifiers: ["ctrl", "alt"], key: "arrowUp" },
                        }}
                        onAction={() => onRearrange(scene, "up")}
                      />
                    )}
                    {validDirections.down && (
                      <Action
                        title="Move Down in Pinned"
                        icon={Icon.ArrowDown}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "opt"], key: "arrowDown" },
                          Windows: { modifiers: ["ctrl", "alt"], key: "arrowDown" },
                        }}
                        onAction={() => onRearrange(scene, "down")}
                      />
                    )}
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action.Push
                      title="View Scene Details"
                      icon={Icon.Eye}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "i" },
                        Windows: { modifiers: ["ctrl"], key: "i" },
                      }}
                      target={<SceneDetails scene={scene} devices={devices} />}
                    />
                    <Action.Push
                      title="Edit Scene"
                      icon={Icon.Pencil}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "e" },
                        Windows: { modifiers: ["ctrl"], key: "e" },
                      }}
                      target={<EditSceneForm scene={scene} onUpdate={loadData} />}
                    />
                    <Action
                      title="Delete Scene"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{
                        macOS: { modifiers: ["ctrl"], key: "x" },
                        Windows: { modifiers: ["ctrl"], key: "d" },
                      }}
                      onAction={() => handleDeleteScene(scene)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action.Push
                      title="Create Scene"
                      icon={Icon.Plus}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "n" },
                        Windows: { modifiers: ["ctrl"], key: "n" },
                      }}
                      target={<CreateSceneForm devices={devices} onUpdate={loadData} />}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {/* All Scenes Section */}
      <List.Section title={`All Scenes (${unpinnedScenes.length})`}>
        {unpinnedScenes.map((scene) => {
          const deviceCount = scene.deviceStates.length;
          const deviceNames = scene.deviceStates.map((ds) => ds.deviceName).join(", ");

          return (
            <List.Item
              key={scene.id}
              title={scene.name}
              subtitle={scene.description}
              icon={{ source: Icon.Stars, tintColor: Color.Purple }}
              accessories={[
                {
                  text: `${deviceCount} device${deviceCount !== 1 ? "s" : ""}`,
                  tooltip: deviceNames,
                  icon: Icon.LightBulb,
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Apply Scene"
                      icon={{ source: Icon.Play, tintColor: Color.Green }}
                      onAction={() => applyScene(scene)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action
                      title="Pin Scene"
                      icon={Icon.Pin}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "p" },
                        Windows: { modifiers: ["ctrl"], key: "." },
                      }}
                      onAction={() => onPin(scene)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action.Push
                      title="View Scene Details"
                      icon={Icon.Eye}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "i" },
                        Windows: { modifiers: ["ctrl"], key: "i" },
                      }}
                      target={<SceneDetails scene={scene} devices={devices} />}
                    />
                    <Action.Push
                      title="Edit Scene"
                      icon={Icon.Pencil}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "e" },
                        Windows: { modifiers: ["ctrl"], key: "e" },
                      }}
                      target={<EditSceneForm scene={scene} onUpdate={loadData} />}
                    />
                    <Action
                      title="Delete Scene"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{
                        macOS: { modifiers: ["ctrl"], key: "x" },
                        Windows: { modifiers: ["ctrl"], key: "d" },
                      }}
                      onAction={() => handleDeleteScene(scene)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action.Push
                      title="Create Scene"
                      icon={Icon.Plus}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "n" },
                        Windows: { modifiers: ["ctrl"], key: "n" },
                      }}
                      target={<CreateSceneForm devices={devices} onUpdate={loadData} />}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

interface EditSceneFormProps {
  scene: WLEDScene;
  onUpdate: () => void;
}

function EditSceneForm({ scene, onUpdate }: EditSceneFormProps) {
  const { pop } = useNavigation();
  const [sceneName, setSceneName] = useState(scene.name);
  const [sceneDescription, setSceneDescription] = useState(scene.description || "");
  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; description?: string }) {
    if (!values.name.trim()) {
      setNameError("Scene name is required");
      return;
    }

    try {
      await updateScene(scene.id, {
        name: values.name.trim(),
        description: values.description?.trim(),
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Scene Updated",
        message: `"${values.name}" updated successfully`,
      });

      onUpdate();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Scene",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Editing: ${scene.name}`} />

      <Form.TextField
        id="name"
        title="Scene Name"
        placeholder="e.g., Movie Time, Relaxing Evening"
        value={sceneName}
        onChange={(value) => {
          setSceneName(value);
          if (nameError && value.trim()) {
            setNameError(undefined);
          }
        }}
        error={nameError}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description"
        value={sceneDescription}
        onChange={setSceneDescription}
      />
    </Form>
  );
}

interface SceneDetailsProps {
  scene: WLEDScene;
  devices: WLEDDevice[];
}

function SceneDetails({ scene, devices }: SceneDetailsProps) {
  return (
    <List searchBarPlaceholder="Search devices in scene...">
      <List.Section title="Scene Information">
        <List.Item title="Name" subtitle={scene.name} icon={Icon.Tag} />
        {scene.description && <List.Item title="Description" subtitle={scene.description} icon={Icon.Text} />}
        <List.Item title="Created" subtitle={new Date(scene.createdAt).toLocaleString()} icon={Icon.Calendar} />
        <List.Item title="Last Modified" subtitle={new Date(scene.updatedAt).toLocaleString()} icon={Icon.Clock} />
        <List.Item
          title="Total Devices"
          subtitle={`${scene.deviceStates.length} device${scene.deviceStates.length !== 1 ? "s" : ""}`}
          icon={Icon.LightBulb}
        />
      </List.Section>

      <List.Section title="Included Devices">
        {scene.deviceStates.map((deviceState) => {
          const deviceExists = devices.some((d) => d.ip === deviceState.deviceIp);

          return (
            <List.Item
              key={deviceState.deviceIp}
              title={deviceState.deviceName}
              subtitle={deviceState.deviceIp}
              icon={{
                source: Icon.LightBulb,
                tintColor: deviceExists ? Color.Orange : Color.SecondaryText,
              }}
              accessories={!deviceExists ? [{ text: "Device not found", icon: Icon.Warning }] : undefined}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Device State"
                    icon={Icon.Eye}
                    target={<DeviceStateDetails deviceState={deviceState} />}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

interface DeviceStateDetailsProps {
  deviceState: DeviceState;
}

function DeviceStateDetails({ deviceState }: DeviceStateDetailsProps) {
  return (
    <List>
      <List.Section title="Device Information">
        <List.Item title="Name" subtitle={deviceState.deviceName} icon={Icon.Tag} />
        <List.Item title="IP Address" subtitle={deviceState.deviceIp} icon={Icon.Network} />
      </List.Section>

      <List.Section title="Saved State">
        <List.Item
          title="Power"
          subtitle={deviceState.power ? "On" : "Off"}
          icon={{ source: Icon.Power, tintColor: deviceState.power ? Color.Green : Color.Red }}
        />
        <List.Item
          title="Brightness"
          subtitle={`${deviceState.brightness} / 255`}
          icon={{ source: Icon.Sun, tintColor: Color.Yellow }}
        />
        {deviceState.color && (
          <List.Item
            title="Color"
            subtitle={`RGB(${deviceState.color[0]}, ${deviceState.color[1]}, ${deviceState.color[2]}) - #${deviceState.color[0].toString(16).padStart(2, "0")}${deviceState.color[1].toString(16).padStart(2, "0")}${deviceState.color[2].toString(16).padStart(2, "0")}`}
            icon={{
              source: Icon.Circle,
              tintColor: `#${deviceState.color[0].toString(16).padStart(2, "0")}${deviceState.color[1].toString(16).padStart(2, "0")}${deviceState.color[2].toString(16).padStart(2, "0")}`,
            }}
          />
        )}
        {deviceState.effectId !== undefined && (
          <List.Item title="Effect ID" subtitle={String(deviceState.effectId)} icon={Icon.Stars} />
        )}
        {deviceState.effectSpeed !== undefined && (
          <List.Item title="Effect Speed" subtitle={String(deviceState.effectSpeed)} icon={Icon.Forward} />
        )}
        {deviceState.effectIntensity !== undefined && (
          <List.Item title="Effect Intensity" subtitle={String(deviceState.effectIntensity)} icon={Icon.Signal3} />
        )}
        {deviceState.paletteId !== undefined && (
          <List.Item title="Palette ID" subtitle={String(deviceState.paletteId)} icon={Icon.AppWindowGrid2x2} />
        )}
      </List.Section>
    </List>
  );
}
