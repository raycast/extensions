import {
  Action,
  ActionPanel,
  Color,
  closeMainWindow,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import {
  type AudioDevice,
  type IOType,
  getDefaultInputDevice,
  getDefaultOutputDevice,
  getInputDevices,
  getOutputDevices,
  getOutputDeviceVolume,
  getInputDeviceVolume,
  getOutputDeviceMute,
  getInputDeviceMute,
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
  const { isLoading, data, revalidate: refetchDevices } = useAudioDevices(ioType);
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

  const sortedDevices = (() => {
    const currentUid = data?.current?.uid;
    const devices = [...(data?.devices ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    const pinned = new Set<string>();
    if (currentUid) pinned.add(currentUid);
    if (defaultDeviceUid) pinned.add(defaultDeviceUid);
    const top = devices.filter((d) => pinned.has(d.uid));
    const rest = devices.filter((d) => !pinned.has(d.uid));
    return [...top, ...rest];
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
        closeMainWindow({ clearRootSearch: true });
        popToRoot({ clearSearchBar: true });
        showHUD(`Active ${ioType} audio device set to ${target.name}`);
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
    <List isLoading={loading} searchBarPlaceholder="Search devices...">
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
          const isCurrent = d.uid === data.current.uid;
          const isHidden = hiddenSet.has(d.uid);
          const isDefault = d.uid === defaultDeviceUid;
          const volInfo = data.volumes[d.uid];
          const pinnedLevel = pinnedVolumeCache.data?.[d.uid];
          return (
            <List.Item
              key={d.uid}
              title={d.name}
              subtitle={getTransportTypeLabel(d)}
              icon={getIcon(d, d.uid === data.current.uid)}
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
                    onSelection={() => void refetchDevices()}
                    onHiddenChange={() => void refetchHiddenDevices()}
                    onShowHiddenChange={() => void refetchShowHiddenDevices()}
                    onDefaultChange={() => void refetchDefaultDevice()}
                    onPinnedChange={() => void pinnedVolumeCache.revalidate()}
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
}: {
  ioType: IOType;
  device: AudioDevice;
  isHidden: boolean;
  isDefault: boolean;
  isShowingHidden: boolean;
  volumeInfo?: VolumeInfo;
  pinnedLevel?: number;
  onSelection: () => void;
  onHiddenChange: () => void;
  onShowHiddenChange: () => void;
  onDefaultChange: () => void;
  onPinnedChange: () => void;
}) {
  return (
    <>
      <SetAudioDeviceAction device={device} type={ioType} onSelection={onSelection} />
      {isWindows && <SetCommunicationDeviceAction device={device} type={ioType} onSelection={onSelection} />}
      <ToggleMuteAction device={device} ioType={ioType} volumeInfo={volumeInfo} />
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
        onEnforced={onSelection}
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

function useAudioDevices(type: IOType) {
  return usePromise(
    async (type) => {
      const devices = await (type === "input" ? getInputDevices() : getOutputDevices());
      const current = await (type === "input" ? getDefaultInputDevice() : getDefaultOutputDevice());

      const getVol = type === "input" ? getInputDeviceVolume : getOutputDeviceVolume;
      const getMute = type === "input" ? getInputDeviceMute : getOutputDeviceMute;

      const volumes: Record<string, VolumeInfo> = {};
      await Promise.all(
        devices.map(async (d) => {
          const [volume, muted] = await Promise.all([
            getVol(d.id).catch(() => undefined),
            getMute(d.id).catch(() => undefined),
          ]);
          volumes[d.uid] = { volume, muted };
        }),
      );

      return { devices, current, volumes };
    },
    [type],
  );
}

type SetAudioDeviceActionProps = {
  device: AudioDevice;
  type: IOType;
  onSelection?: () => void;
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
          onSelection?.();
          closeMainWindow({ clearRootSearch: true });
          popToRoot({ clearSearchBar: true });
          showHUD(`Set "${device.name}" as ${type} device`);
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
            onSelection?.();
            closeMainWindow({ clearRootSearch: true });
            popToRoot({ clearSearchBar: true });
            showHUD(`Set "${device.name}" as ${type} communication device`);
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
  onEnforced,
}: {
  device: AudioDevice;
  ioType: IOType;
  isDefault: boolean;
  onAction: () => void;
  onEnforced?: () => void;
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
        onAction();
        await showToast(Toast.Style.Success, `Set "${device.name}" as default ${ioType} device`);
        const enforceCmd = ioType === "input" ? "auto-switch-input" : "auto-switch-output";
        try {
          await launchCommand({ name: enforceCmd, type: LaunchType.Background });
          onEnforced?.();
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
}: {
  device: AudioDevice;
  ioType: IOType;
  volumeInfo?: VolumeInfo;
}) {
  const isMuted = volumeInfo?.muted === true;
  const toggleFn = ioType === "input" ? toggleInputDeviceMute : toggleOutputDeviceMute;

  return (
    <Action
      title={isMuted ? "Unmute" : "Mute"}
      icon={isMuted ? Icon.SpeakerOn : Icon.SpeakerOff}
      shortcut={{ modifiers: ["cmd"], key: "m" }}
      onAction={async () => {
        try {
          const nowMuted = await toggleFn(device.id);
          const vol = volumeInfo?.volume != null ? Math.round(volumeInfo.volume * 100) : "?";
          if (nowMuted) {
            await showHUD(`Muted ${device.name}`);
          } else {
            await showHUD(`Unmuted ${device.name} (${vol}%)`);
          }
        } catch {
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
