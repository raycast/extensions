import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  openExtensionPreferences,
  popToRoot,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { YandexAuthGate } from "../auth/auth-views";
import { showFetchUserInfoError } from "../utils/utils";
import {
  getUserInfo,
  deviceAction,
  hasOnOffCapability,
  getOnOffState,
  hasBrightnessCapability,
  getBrightnessState,
  getBrightnessRange,
  rangeSteps,
  hasTemperatureK,
  hasColorScene,
  hasColorModel,
  getColorModel,
  getTemperatureKRange,
  getColorScenes,
  getColorSettingState,
  getDevicePropertyStates,
  round2,
  TEMPERATURE_K_PRESETS,
  COLOR_SCENE_NAMES,
  PRESET_COLORS_HSV,
  hsvToRgb24,
  type DeviceObject,
  type UserInfo,
} from "../api/yandex-iot";

function getDeviceIcon(device: DeviceObject): string {
  const t = device.type ?? "";
  if (t.includes("light") || t.includes("lamp")) return Icon.LightBulb;
  if (t.includes("socket") || t.includes("switch")) return Icon.Plug;
  if (t.includes("vacuum")) return Icon.Lorry;
  if (t.includes("speaker") || t.includes("station")) return Icon.Music;
  if (t.includes("thermostat") || t.includes("climate")) return Icon.Leaf;
  return Icon.Box;
}

function roomName(rooms: UserInfo["rooms"], roomId: string | null): string {
  if (!roomId) return "—";
  const room = rooms.find((r) => r.id === roomId);
  return room?.name ?? roomId;
}

function BrightnessPicker({
  token,
  deviceId,
  deviceName,
  steps,
  current,
  onDone,
}: {
  token: string;
  deviceId: string;
  deviceName: string;
  steps: number[];
  current: number | null;
  onDone: () => void;
}) {
  const setBrightness = useCallback(
    async (value: number) => {
      try {
        await deviceAction(token, [
          {
            id: deviceId,
            actions: [
              {
                type: "devices.capabilities.range",
                state: { instance: "brightness", value },
              },
            ],
          },
        ]);
        showToast({
          style: Toast.Style.Success,
          title: `${deviceName}: ${round2(value)}%`,
        });
        onDone();
        popToRoot();
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [token, deviceId, deviceName, onDone],
  );

  return (
    <List navigationTitle={`Brightness — ${deviceName}`}>
      {steps.map((pct) => (
        <List.Item
          key={pct}
          icon={Icon.Circle}
          title={`${round2(pct)}%`}
          accessories={
            current !== null && round2(current) === round2(pct)
              ? [{ icon: Icon.Checkmark, text: "Current" }]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                title={`Set ${round2(pct)}%`}
                icon={Icon.Circle}
                onAction={() => setBrightness(pct)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ColorTemperaturePicker({
  token,
  deviceId,
  deviceName,
  range,
  currentK,
  onDone,
}: {
  token: string;
  deviceId: string;
  deviceName: string;
  range: { min: number; max: number };
  currentK: number | null;
  onDone: () => void;
}) {
  const presets = TEMPERATURE_K_PRESETS.filter(
    (p) => p.value >= range.min && p.value <= range.max,
  );
  if (presets.length === 0) {
    presets.push(
      { value: range.min, label: `${round2(range.min)} K` },
      { value: range.max, label: `${round2(range.max)} K` },
    );
  }

  const setTemperature = useCallback(
    async (value: number) => {
      try {
        await deviceAction(token, [
          {
            id: deviceId,
            actions: [
              {
                type: "devices.capabilities.color_setting",
                state: { instance: "temperature_k", value },
              },
            ],
          },
        ]);
        showToast({
          style: Toast.Style.Success,
          title: `${deviceName}: ${round2(value)} K`,
        });
        onDone();
        popToRoot();
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [token, deviceId, deviceName, onDone],
  );

  return (
    <List navigationTitle={`Color temperature — ${deviceName}`}>
      {presets.map((p) => (
        <List.Item
          key={p.value}
          icon={Icon.LightBulb}
          title={p.label}
          subtitle={`${round2(p.value)} K`}
          accessories={
            currentK !== null && round2(currentK) === round2(p.value)
              ? [{ icon: Icon.Checkmark, text: "Current" }]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                title={`Set ${p.label}`}
                icon={Icon.LightBulb}
                onAction={() => setTemperature(p.value)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ColorScenePicker({
  token,
  deviceId,
  deviceName,
  scenes,
  currentScene,
  onDone,
}: {
  token: string;
  deviceId: string;
  deviceName: string;
  scenes: { id: string }[];
  currentScene: string | null;
  onDone: () => void;
}) {
  const setScene = useCallback(
    async (sceneId: string) => {
      try {
        await deviceAction(token, [
          {
            id: deviceId,
            actions: [
              {
                type: "devices.capabilities.color_setting",
                state: { instance: "scene", value: sceneId },
              },
            ],
          },
        ]);
        const name = COLOR_SCENE_NAMES[sceneId] ?? sceneId;
        showToast({
          style: Toast.Style.Success,
          title: `${deviceName}: ${name}`,
        });
        onDone();
        popToRoot();
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [token, deviceId, deviceName, onDone],
  );

  return (
    <List navigationTitle={`Scene — ${deviceName}`}>
      {scenes.map((s) => {
        const label = COLOR_SCENE_NAMES[s.id] ?? s.id;
        return (
          <List.Item
            key={s.id}
            icon={Icon.Bubble}
            title={label}
            accessories={
              currentScene === s.id
                ? [{ icon: Icon.Checkmark, text: "Current" }]
                : []
            }
            actions={
              <ActionPanel>
                <Action
                  title={`Set ${label}`}
                  icon={Icon.Bubble}
                  onAction={() => setScene(s.id)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function ColorPicker({
  token,
  deviceId,
  deviceName,
  colorModel,
  onDone,
}: {
  token: string;
  deviceId: string;
  deviceName: string;
  colorModel: "hsv" | "rgb";
  onDone: () => void;
}) {
  const setColor = useCallback(
    async (h: number, s: number, v: number) => {
      try {
        const state =
          colorModel === "hsv"
            ? { instance: "hsv" as const, value: { h, s, v } }
            : {
                instance: "rgb" as const,
                value: hsvToRgb24(h, s, v),
              };
        await deviceAction(token, [
          {
            id: deviceId,
            actions: [
              {
                type: "devices.capabilities.color_setting",
                state,
              },
            ],
          },
        ]);
        showToast({
          style: Toast.Style.Success,
          title: `${deviceName}: Color Set`,
        });
        onDone();
        popToRoot();
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [token, deviceId, deviceName, colorModel, onDone],
  );

  return (
    <List navigationTitle={`Color — ${deviceName}`}>
      {PRESET_COLORS_HSV.map((preset) => (
        <List.Item
          key={preset.label}
          icon={{
            source: Icon.Circle,
            tintColor: hsvToHex(preset.h, preset.s, preset.v),
          }}
          title={preset.label}
          subtitle={`H ${round2(preset.h)}° S ${round2(preset.s)}% V ${round2(preset.v)}%`}
          actions={
            <ActionPanel>
              <Action
                title={`Set ${preset.label}`}
                icon={Icon.Circle}
                onAction={() => setColor(preset.h, preset.s, preset.v)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/** HSV to hex for List.Item tintColor. */
function hsvToHex(h: number, s: number, v: number): string {
  const n = hsvToRgb24(h, s, v);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function DevicesView({ token }: { token: string }) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showingDetail, setShowingDetail] = useState(false);

  const fetchUserInfo = useCallback(async () => {
    setLoading(true);
    try {
      const info = await getUserInfo(token);
      setUserInfo(info);
    } catch (e) {
      showFetchUserInfoError(e);
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const runDeviceAction = useCallback(
    async (
      deviceId: string,
      type: string,
      instance: string,
      value: string | number | boolean,
    ) => {
      try {
        await deviceAction(token, [
          { id: deviceId, actions: [{ type, state: { instance, value } }] },
        ]);
        showToast({ style: Toast.Style.Success, title: "Done" });
        await fetchUserInfo();
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Action Failed",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [token, fetchUserInfo],
  );

  const devices = userInfo?.devices ?? [];
  const rooms = userInfo?.rooms ?? [];

  // Group devices by room: sections = [ { title, devices } ]
  const NO_ROOM = "__no_room__";
  const byRoom = new Map<string, { title: string; devices: DeviceObject[] }>();
  for (const device of devices) {
    const rid = device.room ?? NO_ROOM;
    const title =
      rid === NO_ROOM ? "Without Room" : roomName(rooms, device.room);
    if (!byRoom.has(rid)) byRoom.set(rid, { title, devices: [] });
    byRoom.get(rid)!.devices.push(device);
  }
  const sectionOrder = [...byRoom.entries()].sort((a, b) => {
    if (a[0] === NO_ROOM) return 1;
    if (b[0] === NO_ROOM) return -1;
    return a[1].title.localeCompare(b[1].title);
  });

  return (
    <List
      isLoading={loading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search devices by name or room"
    >
      {sectionOrder.map(([roomId, { title, devices: sectionDevices }]) => (
        <List.Section key={roomId} title={title}>
          {sectionDevices.map((device) => {
            const onOff = hasOnOffCapability(device);
            const on = getOnOffState(device) === true;
            const brightness = hasBrightnessCapability(device);
            const brightnessValue = getBrightnessState(device);
            const brightnessRange = brightness
              ? getBrightnessRange(device)
              : null;
            const brightnessSteps = brightnessRange
              ? rangeSteps(
                  brightnessRange.min,
                  brightnessRange.max,
                  brightnessRange.precision,
                )
              : [];
            const temperatureK = hasTemperatureK(device);
            const temperatureRange = temperatureK
              ? getTemperatureKRange(device)
              : null;
            const colorScenes = getColorScenes(device);
            const hasScenes = hasColorScene(device);
            const colorState = getColorSettingState(device);
            const currentTemperatureK =
              colorState?.instance === "temperature_k" &&
              typeof colorState.value === "number"
                ? colorState.value
                : null;
            const currentScene =
              colorState?.instance === "scene" &&
              typeof colorState.value === "string"
                ? colorState.value
                : null;
            const colorModelSupport = hasColorModel(device);
            const colorModelValue = getColorModel(device);
            const propertyStates = getDevicePropertyStates(device);
            const sensorSummary =
              propertyStates.length > 0
                ? propertyStates.map((p) => p.label).join(" · ")
                : null;
            const typeLabel = device.type.replace("devices.types.", "");
            const subtitleInList = sensorSummary ? `(${sensorSummary})` : "";
            const tooltipFull = [
              typeLabel,
              onOff ? (on ? "On" : "Off") : null,
              sensorSummary,
            ]
              .filter(Boolean)
              .join(" · ");
            const accessories: { text: string }[] = [];
            if (onOff) accessories.push({ text: on ? "On" : "Off" });

            const detailMarkdown = [
              `# ${device.name}`,
              "",
              `**Type:** ${typeLabel}`,
              onOff ? `**Status:** ${on ? "On" : "Off"}` : null,
              propertyStates.length > 0
                ? `\n**Sensors:**\n${propertyStates.map((p) => `- ${p.label}`).join("\n")}`
                : null,
            ]
              .filter(Boolean)
              .join("\n");

            const detailProps = showingDetail
              ? { detail: <List.Item.Detail markdown={detailMarkdown} /> }
              : {};

            return (
              <List.Item
                key={device.id}
                icon={getDeviceIcon(device)}
                title={device.name}
                subtitle={{ value: subtitleInList, tooltip: tooltipFull }}
                accessories={accessories}
                {...detailProps}
                actions={
                  <ActionPanel>
                    {onOff && (
                      <Action
                        title="Toggle"
                        icon={on ? Icon.LightBulbOff : Icon.LightBulb}
                        onAction={() =>
                          runDeviceAction(
                            device.id,
                            "devices.capabilities.on_off",
                            "on",
                            !on,
                          )
                        }
                      />
                    )}
                    {brightness && (
                      <Action.Push
                        title="Set Brightness…"
                        icon={Icon.Circle}
                        target={
                          <BrightnessPicker
                            token={token}
                            deviceId={device.id}
                            deviceName={device.name}
                            steps={brightnessSteps}
                            current={brightnessValue}
                            onDone={fetchUserInfo}
                          />
                        }
                      />
                    )}
                    {temperatureK && temperatureRange && (
                      <Action.Push
                        title="Color Temperature…"
                        icon={Icon.LightBulb}
                        target={
                          <ColorTemperaturePicker
                            token={token}
                            deviceId={device.id}
                            deviceName={device.name}
                            range={temperatureRange}
                            currentK={currentTemperatureK}
                            onDone={fetchUserInfo}
                          />
                        }
                      />
                    )}
                    {hasScenes && colorScenes.length > 0 && (
                      <Action.Push
                        title="Scene…"
                        icon={Icon.Bubble}
                        target={
                          <ColorScenePicker
                            token={token}
                            deviceId={device.id}
                            deviceName={device.name}
                            scenes={colorScenes}
                            currentScene={currentScene}
                            onDone={fetchUserInfo}
                          />
                        }
                      />
                    )}
                    {colorModelSupport && colorModelValue && (
                      <Action.Push
                        title="Color…"
                        icon={Icon.Circle}
                        target={
                          <ColorPicker
                            token={token}
                            deviceId={device.id}
                            deviceName={device.name}
                            colorModel={colorModelValue}
                            onDone={fetchUserInfo}
                          />
                        }
                      />
                    )}
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={fetchUserInfo}
                    />
                    <Action
                      title="Toggle Detail"
                      icon={Icon.Sidebar}
                      onAction={() => setShowingDetail(!showingDetail)}
                    />
                    <Action
                      title="Open Preferences"
                      icon={Icon.Gear}
                      onAction={openExtensionPreferences}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
      {!loading && devices.length === 0 && (
        <List.EmptyView
          icon={Icon.Box}
          title="No devices"
          description="Add devices in the Yandex app or check your account."
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

export default function DevicesCommand() {
  return (
    <YandexAuthGate>{(token) => <DevicesView token={token} />}</YandexAuthGate>
  );
}
