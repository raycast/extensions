import {
  Action,
  ActionPanel,
  Cache,
  Color,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import {
  type AudioDevice,
  type IOType,
  getDefaultInputDevice,
  getDefaultOutputDevice,
  getInputDevices,
  getOutputDevices,
  getAllVolumeInfo,
  toggleOutputDeviceMute,
  toggleInputDeviceMute,
  setDefaultInputDevice,
  isWindows,
  getAudioAPI,
} from "./audio-device";
import { setOutputAndSystemDevice } from "./device-actions";
import {
  getHiddenDevices,
  isShowingHiddenDevices,
  setShowHiddenDevices,
  toggleDeviceVisibility,
  getDefaultDeviceUid,
  setDefaultDevicePreference,
  clearDefaultDevicePreference,
  getPinnedVolume,
  setPinnedVolume,
  clearPinnedVolume,
  setGraceUntil,
} from "./device-preferences";
import { getTransportTypeLabel } from "./device-labels";
import { getIcon } from "./device-icons";
import { getAccessories, type VolumeInfo } from "./device-accessories";
import { createDeepLink } from "./utils";

type DeviceListProps = {
  ioType: IOType;
  deviceId?: string;
  deviceName?: string;
};

export function DeviceList({ ioType, deviceId, deviceName }: DeviceListProps) {
  const { isLoading, data, revalidateDevices } = useAudioDevices(ioType);
  const [currentOverride, setCurrentOverride] = useState<string | null>(null);
  const [volumeOverrides, setVolumeOverrides] = useState<Record<string, Partial<VolumeInfo>>>({});
  const updateVolume = useCallback(
    (deviceUid: string, update: Partial<VolumeInfo>) =>
      setVolumeOverrides((prev) => ({ ...prev, [deviceUid]: { ...prev[deviceUid], ...update } })),
    [],
  );
  const {
    data: hiddenDevices,
    isLoading: isHiddenLoading,
    revalidate: refetchHiddenDevices,
  } = usePromise(getHiddenDevices, [ioType]);
  const {
    data: showHiddenDevices,
    isLoading: isShowHiddenLoading,
    revalidate: refetchShowHiddenDevices,
  } = usePromise(isShowingHiddenDevices, [ioType]);
  const { data: defaultDeviceUid, revalidate: refetchDefaultDevice } = usePromise(getDefaultDeviceUid, [ioType]);
  const pinnedVolumeCache = usePromise(
    async (type: IOType, devices: AudioDevice[]) => {
      const result: Record<string, number | undefined> = {};
      await Promise.all(
        devices.map(async (d) => {
          result[d.uid] = await getPinnedVolume(type, d.uid);
        }),
      );
      return result;
    },
    [ioType, data?.devices ?? []],
  );

  const effectiveCurrentUid = currentOverride ?? data?.current?.uid;

  const sortedDevices = (() => {
    const devices = [...(data?.devices ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    const current = effectiveCurrentUid ? devices.find((d) => d.uid === effectiveCurrentUid) : undefined;
    const defaultDev =
      defaultDeviceUid && defaultDeviceUid !== effectiveCurrentUid
        ? devices.find((d) => d.uid === defaultDeviceUid)
        : undefined;
    const topUids = new Set([effectiveCurrentUid, defaultDeviceUid].filter(Boolean));
    const rest = devices.filter((d) => !topUids.has(d.uid));
    return [...(current ? [current] : []), ...(defaultDev ? [defaultDev] : []), ...rest];
  })();

  useEffect(() => {
    if ((!deviceId && !deviceName) || !data?.devices) return;

    let device: AudioDevice | undefined;
    if (deviceId) device = data.devices.find((d) => d.id === deviceId);
    if (!device && deviceName) device = data.devices.find((d) => d.name === deviceName);

    if (!device) {
      const searchCriteria = deviceId ? `id ${deviceId}` : `name "${deviceName}"`;
      showToast(Toast.Style.Failure, "Error!", `The device with ${searchCriteria} was not found.`);
      return;
    }

    const target = device;
    (async () => {
      try {
        await (ioType === "input" ? setDefaultInputDevice(target.id) : setOutputAndSystemDevice(target.id));
        await setGraceUntil(ioType, Date.now() + 60_000);
        await showToast(Toast.Style.Success, `Set "${target.name}" as ${ioType} device`);
      } catch (e) {
        console.error(e);
        showToast(
          Toast.Style.Failure,
          `Error!`,
          `There was an error setting the active ${ioType} audio device to ${target.name}`,
        );
      }
    })();
  }, [deviceId, deviceName, data, ioType]);

  const hiddenSet = new Set(hiddenDevices ?? []);
  const shouldShowHidden = showHiddenDevices ?? false;
  const visibleDevices = sortedDevices.filter((device) => shouldShowHidden || !hiddenSet.has(device.uid));

  const loading = isLoading || isHiddenLoading || isShowHiddenLoading;
  const showEmptyView = !loading && visibleDevices.length === 0;

  return (
    <List isLoading={loading} searchBarPlaceholder={`Search ${ioType} devices...`}>
      {showEmptyView ? (
        <List.EmptyView
          title={shouldShowHidden ? "No devices found" : "No visible devices"}
          description={shouldShowHidden ? undefined : "Hidden devices are not shown. Toggle to manage hidden devices."}
          actions={
            <ActionPanel>
              <ToggleShowHiddenDevicesAction
                ioType={ioType}
                isShowing={shouldShowHidden}
                onToggle={() => void refetchShowHiddenDevices()}
              />
            </ActionPanel>
          }
        />
      ) : (
        data &&
        visibleDevices.map((d) => {
          const isCurrent = d.uid === effectiveCurrentUid;
          const isHidden = hiddenSet.has(d.uid);
          const isDefault = d.uid === defaultDeviceUid;
          const baseVol = data.volumes[d.uid];
          const volInfo = volumeOverrides[d.uid] ? { ...baseVol, ...volumeOverrides[d.uid] } : baseVol;
          const pinnedLevel = pinnedVolumeCache.data?.[d.uid];
          return (
            <List.Item
              key={d.uid}
              title={d.name}
              subtitle={getTransportTypeLabel(d)}
              icon={getIcon(d, d.uid === effectiveCurrentUid)}
              actions={
                <ActionPanel>
                  <DeviceActions
                    ioType={ioType}
                    device={d}
                    isHidden={isHidden}
                    isDefault={isDefault}
                    isShowingHidden={shouldShowHidden}
                    volumeInfo={volInfo}
                    pinnedLevel={pinnedLevel}
                    onSelection={(uid) => {
                      setCurrentOverride(uid);
                      void revalidateDevices();
                    }}
                    onHiddenChange={() => void refetchHiddenDevices()}
                    onShowHiddenChange={() => void refetchShowHiddenDevices()}
                    onDefaultChange={() => void refetchDefaultDevice()}
                    onPinnedChange={() => void pinnedVolumeCache.revalidate()}
                    onVolumeUpdate={updateVolume}
                  />
                </ActionPanel>
              }
              accessories={getAccessories(isCurrent, isHidden, isDefault, shouldShowHidden, d, volInfo, pinnedLevel)}
            />
          );
        })
      )}
    </List>
  );
}

function DeviceActions({
  ioType,
  device,
  isHidden,
  isDefault,
  isShowingHidden,
  volumeInfo,
  pinnedLevel,
  onSelection,
  onHiddenChange,
  onShowHiddenChange,
  onDefaultChange,
  onPinnedChange,
  onVolumeUpdate,
}: {
  ioType: IOType;
  device: AudioDevice;
  isHidden: boolean;
  isDefault: boolean;
  isShowingHidden: boolean;
  volumeInfo?: VolumeInfo;
  pinnedLevel?: number;
  onSelection: (uid: string) => void;
  onHiddenChange: () => void;
  onShowHiddenChange: () => void;
  onDefaultChange: () => void;
  onPinnedChange: () => void;
  onVolumeUpdate: (deviceUid: string, update: Partial<VolumeInfo>) => void;
}) {
  return (
    <>
      <SetAudioDeviceAction device={device} type={ioType} onSelection={onSelection} />
      {isWindows && <SetCommunicationDeviceAction device={device} type={ioType} onSelection={onSelection} />}
      <ToggleMuteAction device={device} ioType={ioType} volumeInfo={volumeInfo} onVolumeUpdate={onVolumeUpdate} />
      <PinVolumeAction
        device={device}
        ioType={ioType}
        volumeInfo={volumeInfo}
        pinnedLevel={pinnedLevel}
        onAction={onPinnedChange}
      />
      <SetDefaultDeviceAction
        device={device}
        ioType={ioType}
        isDefault={isDefault}
        onAction={onDefaultChange}
        onSelection={onSelection}
      />
      <ActionPanel.Section>
        <Action.CreateQuicklink
          quicklink={{
            name: `Set ${device.isOutput ? "Output" : "Input"} Device to ${device.name}`,
            link: createDeepLink(device.isOutput ? "set-output-device" : "set-input-device", {
              deviceId: device.id,
              deviceName: device.name,
            }),
          }}
        />
        <Action.CopyToClipboard
          title="Copy Device Name"
          content={device.name}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <ToggleHiddenDeviceAction deviceId={device.uid} ioType={ioType} isHidden={isHidden} onAction={onHiddenChange} />
        <ToggleShowHiddenDevicesAction ioType={ioType} isShowing={isShowingHidden} onToggle={onShowHiddenChange} />
      </ActionPanel.Section>
    </>
  );
}

const deviceCache = new Cache();

type DeviceData = { devices: AudioDevice[]; current: AudioDevice; volumes: Record<string, VolumeInfo> };

function readCached<T>(key: string): T | undefined {
  const raw = deviceCache.get(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function useAudioDevices(type: IOType) {
  type DeviceInfo = { devices: AudioDevice[]; current: AudioDevice };

  const [cachedDevices] = useState(() => readCached<DeviceInfo>(`devices_${type}`));
  const [cachedVolumes] = useState(
    () => readCached<Record<string, { volume?: number; muted?: boolean }>>(`volumes_${type}`) ?? {},
  );

  const deviceInfo = usePromise(
    async (ioType: IOType) => {
      const [devices, current] = await Promise.all([
        ioType === "input" ? getInputDevices() : getOutputDevices(),
        ioType === "input" ? getDefaultInputDevice() : getDefaultOutputDevice(),
      ]);
      deviceCache.set(`devices_${ioType}`, JSON.stringify({ devices, current }));
      return { devices, current };
    },
    [type],
  );

  const devices = deviceInfo.data ?? cachedDevices;

  const volumeInfo = usePromise(
    async (ioType: IOType) => {
      const batch = await getAllVolumeInfo(ioType);
      deviceCache.set(`volumes_${ioType}`, JSON.stringify(batch));
      return batch;
    },
    [type],
  );

  const rawVolumes = volumeInfo.data ?? cachedVolumes;
  const mappedVolumes: Record<string, VolumeInfo> = {};
  if (devices) {
    for (const d of devices.devices) {
      const info = rawVolumes[d.id] ?? rawVolumes[d.uid];
      if (info) mappedVolumes[d.uid] = { volume: info.volume, muted: info.muted };
    }
  }

  const data: DeviceData | undefined = devices ? { ...devices, volumes: mappedVolumes } : undefined;

  return {
    isLoading: !data,
    data,
    revalidateDevices: deviceInfo.revalidate,
  };
}

type SetAudioDeviceActionProps = {
  device: AudioDevice;
  type: IOType;
  onSelection?: (uid: string) => void;
};

function SetAudioDeviceAction({ device, type, onSelection }: SetAudioDeviceActionProps) {
  return (
    <Action
      title={`Set as ${type === "input" ? "Input" : "Output"} Device`}
      icon={{
        source: type === "input" ? "mic.png" : "speaker.png",
        tintColor: Color.PrimaryText,
      }}
      onAction={async () => {
        try {
          await (type === "input" ? setDefaultInputDevice(device.id) : setOutputAndSystemDevice(device.id));
          await setGraceUntil(type, Date.now() + 60_000);
          onSelection?.(device.uid);
          await showToast(Toast.Style.Success, `Set "${device.name}" as ${type} device`);
        } catch (e) {
          console.error(e);
          showToast(Toast.Style.Failure, `Failed setting "${device.name}" as ${type} device`);
        }
      }}
    />
  );
}

function SetCommunicationDeviceAction({ device, type, onSelection }: SetAudioDeviceActionProps) {
  return (
    <Action
      title={`Set as ${type === "input" ? "Input" : "Output"} Communication Device`}
      icon={Icon.Phone}
      shortcut={null}
      onAction={async () => {
        try {
          const api = await getAudioAPI();
          if (api.setDefaultCommunicationOutputDevice && api.setDefaultCommunicationInputDevice) {
            if (type === "input") {
              await api.setDefaultCommunicationInputDevice(device.id);
            } else {
              await api.setDefaultCommunicationOutputDevice(device.id);
            }
            onSelection?.(device.uid);
            await showToast(Toast.Style.Success, `Set "${device.name}" as ${type} communication device`);
          }
        } catch (e) {
          console.error(e);
          showToast(Toast.Style.Failure, `Failed setting "${device.name}" as ${type} communication device`);
        }
      }}
    />
  );
}

function ToggleHiddenDeviceAction({
  deviceId,
  ioType,
  isHidden,
  onAction,
}: {
  deviceId: string;
  ioType: IOType;
  isHidden: boolean;
  onAction: () => void;
}) {
  const title = isHidden ? "Show Device" : "Hide Device";
  const icon = isHidden ? Icon.Eye : Icon.EyeDisabled;

  return (
    <Action
      title={title}
      icon={icon}
      shortcut={null}
      onAction={async () => {
        await toggleDeviceVisibility(ioType, deviceId);
        onAction();
      }}
    />
  );
}

function ToggleShowHiddenDevicesAction({
  ioType,
  isShowing,
  onToggle,
}: {
  ioType: IOType;
  isShowing: boolean;
  onToggle: () => void;
}) {
  return (
    <Action
      title={isShowing ? "Hide Hidden Devices" : "Show Hidden Devices"}
      icon={isShowing ? Icon.EyeDisabled : Icon.Eye}
      onAction={async () => {
        await setShowHiddenDevices(ioType, !isShowing);
        onToggle();
      }}
    />
  );
}

function SetDefaultDeviceAction({
  device,
  ioType,
  isDefault,
  onAction,
  onSelection,
}: {
  device: AudioDevice;
  ioType: IOType;
  isDefault: boolean;
  onAction: () => void;
  onSelection?: (uid: string) => void;
}) {
  if (isDefault) {
    return (
      <Action
        title="Clear Default Device"
        icon={Icon.StarDisabled}
        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        onAction={async () => {
          await clearDefaultDevicePreference(ioType);
          onAction();
          await showToast(Toast.Style.Success, `Cleared default ${ioType} device`);
        }}
      />
    );
  }

  return (
    <Action
      title="Set as Default Device"
      icon={Icon.Star}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      onAction={async () => {
        await setDefaultDevicePreference(ioType, device.uid, device.name);
        await (ioType === "input" ? setDefaultInputDevice(device.id) : setOutputAndSystemDevice(device.id));
        onAction();
        onSelection?.(device.uid);
        await showToast(Toast.Style.Success, `Set "${device.name}" as default ${ioType} device`);
        const enforceCmd = ioType === "input" ? "auto-switch-input" : "auto-switch-output";
        try {
          await launchCommand({ name: enforceCmd, type: LaunchType.Background });
        } catch {
          const label = ioType === "input" ? "Enforce Input Device" : "Enforce Output Device";
          await showToast(
            Toast.Style.Animated,
            `Enable '${label}'`,
            "The background command must be enabled in Raycast for the default device to be enforced automatically.",
          );
        }
      }}
    />
  );
}

function ToggleMuteAction({
  device,
  ioType,
  volumeInfo,
  onVolumeUpdate,
}: {
  device: AudioDevice;
  ioType: IOType;
  volumeInfo?: VolumeInfo;
  onVolumeUpdate: (deviceUid: string, update: Partial<VolumeInfo>) => void;
}) {
  if (volumeInfo?.muted == null) return null;
  const isMuted = volumeInfo.muted === true;
  const toggleFn = ioType === "input" ? toggleInputDeviceMute : toggleOutputDeviceMute;

  return (
    <Action
      title={isMuted ? "Unmute" : "Mute"}
      icon={isMuted ? Icon.SpeakerOn : Icon.SpeakerOff}
      shortcut={{ modifiers: ["cmd"], key: "m" }}
      onAction={async () => {
        try {
          const nowMuted = await toggleFn(device.id);
          onVolumeUpdate(device.uid, { muted: nowMuted });
          const vol = volumeInfo?.volume != null ? Math.round(volumeInfo.volume * 100) : "?";
          if (nowMuted) {
            await showToast(Toast.Style.Success, `Muted ${device.name}`);
          } else {
            await showToast(Toast.Style.Success, `Unmuted ${device.name} (${vol}%)`);
          }
        } catch (e) {
          console.error(e);
          await showToast(Toast.Style.Failure, `Failed to toggle mute for ${device.name}`);
        }
      }}
    />
  );
}

function PinVolumeAction({
  device,
  ioType,
  volumeInfo,
  pinnedLevel,
  onAction,
}: {
  device: AudioDevice;
  ioType: IOType;
  volumeInfo?: VolumeInfo;
  pinnedLevel?: number;
  onAction: () => void;
}) {
  if (pinnedLevel != null) {
    return (
      <Action
        title={`Unpin Volume (${pinnedLevel}%)`}
        icon={Icon.PinDisabled}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        onAction={async () => {
          await clearPinnedVolume(ioType, device.uid);
          onAction();
          await showToast(Toast.Style.Success, `Unpinned volume for ${device.name}`);
        }}
      />
    );
  }

  const currentPct = volumeInfo?.volume != null ? Math.round(volumeInfo.volume * 100) : undefined;
  return (
    <Action
      title={currentPct != null ? `Pin Volume at ${currentPct}%` : "Pin Volume"}
      icon={Icon.Pin}
      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
      onAction={async () => {
        if (currentPct == null) {
          await showToast(Toast.Style.Failure, "Cannot read current volume");
          return;
        }
        await setPinnedVolume(ioType, device.uid, currentPct);
        onAction();
        await showToast(Toast.Style.Success, `Pinned ${device.name} at ${currentPct}%`);
        const enforceCmd = ioType === "input" ? "auto-switch-input" : "auto-switch-output";
        try {
          await launchCommand({ name: enforceCmd, type: LaunchType.Background });
        } catch {
          const label = ioType === "input" ? "Enforce Input Device" : "Enforce Output Device";
          await showToast(
            Toast.Style.Animated,
            `Enable '${label}'`,
            "The background command must be enabled in Raycast for pinned volumes to be enforced automatically.",
          );
        }
      }}
    />
  );
}
