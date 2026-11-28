// The Output Device / Input Device list.
import { Action, ActionPanel, Cache, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AudioDevice,
  type IOType,
  type VolumeInfo,
  errorMessage,
  getAllVolumeInfo,
  getDeviceState,
  transportLabel,
} from "./audio-device";
import { applyPriorities } from "./auto-switcher";
import { CustomizeDeviceAction } from "./customize-device";
import { DISCONNECTED_TINT, getAccessories, getDisconnectedAccessories } from "./device-accessories";
import {
  PinVolumeAction,
  SelectDeviceAction,
  ToggleHiddenDeviceAction,
  ToggleMuteAction,
  ToggleShowHiddenDevicesAction,
} from "./device-actions";
import { deviceIconSource, getIconPool } from "./device-icon-assets";
import { type DeviceStore, useDeviceStore } from "./device-store";
import {
  MovePriorityActions,
  PriorityOrderActions,
  SetPriorityAction,
  SetTopPriorityAction,
  SwitchOnConnectAction,
} from "./priority-actions";
import { connectMode, type ConnectMode } from "./priority/connect-mode";
import { normalizeName, type PriorityEntry } from "./priority/decide";
import { resolveDeviceIcon } from "./priority/icon-pool";
import { priorityNumber } from "./priority/list";
import { displayName } from "./priority/meta";

/** How often the open list re-reads devices and volumes, to show changes made outside the list. */
const REFRESH_MS = 2000;

const cache = new Cache();

function readCache<T>(key: string): T | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** `current` is missing when the direction has no devices. */
type DeviceState = { devices: AudioDevice[]; current?: AudioDevice };

/**
 * Devices, the current device and volumes. The last result is cached so the list opens without a spinner, and it
 * is re-read every REFRESH_MS while the list is open (a device connects, macOS or Auto Switch changes the device).
 * State only changes when the data does, so the periodic read does not re-render the list. `error` is the message of
 * the last failed read, cleared by the next good one.
 */
function useAudioState(ioType: IOType) {
  const devicesKey = `devices_${ioType}`;
  const volumesKey = `volumes_${ioType}`;
  const [devices, setDevices] = useState(() => readCache<DeviceState>(devicesKey));
  const [volumes, setVolumes] = useState(() => readCache<Record<string, VolumeInfo>>(volumesKey) ?? {});
  const [error, setError] = useState<string>();
  const last = useRef({ devices: cache.get(devicesKey) ?? "", volumes: cache.get(volumesKey) ?? "" });

  const refresh = useCallback(async () => {
    const [{ devices: list, current }, info] = await Promise.all([getDeviceState(ioType), getAllVolumeInfo(ioType)]);
    const devicesJson = JSON.stringify({ devices: list, current });
    if (devicesJson !== last.current.devices) {
      last.current.devices = devicesJson;
      cache.set(devicesKey, devicesJson);
      setDevices({ devices: list, current });
    }
    const volumesJson = JSON.stringify(info);
    if (volumesJson !== last.current.volumes) {
      last.current.volumes = volumesJson;
      cache.set(volumesKey, volumesJson);
      setVolumes(info);
    }
  }, [ioType, devicesKey, volumesKey]);

  useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        await refresh();
        setError(undefined);
      } catch (error) {
        console.error("Reading audio devices failed:", error);
        setError(errorMessage(error));
      } finally {
        busy = false;
      }
    };
    void tick();
    const timer = setInterval(tick, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // While the list is open, react to connects and disconnects at once instead of waiting for the background run
  // (about once a minute): run the same priority logic when the set of connected devices changes.
  const deviceSet = devices?.devices
    .map((d) => d.uid)
    .sort()
    .join("|");
  const lastSet = useRef<string | undefined>(undefined);
  const running = useRef(false);
  useEffect(() => {
    if (!deviceSet || deviceSet === lastSet.current || running.current) return;
    const isFirst = lastSet.current === undefined;
    lastSet.current = deviceSet;
    if (isFirst) return;
    running.current = true;
    applyPriorities(ioType)
      .then(refresh)
      .catch((error) => console.error("Applying priorities failed:", error))
      .finally(() => (running.current = false));
  }, [deviceSet, ioType, refresh]);

  const retry = useCallback(() => {
    refresh()
      .then(() => setError(undefined))
      .catch((error) => setError(errorMessage(error)));
  }, [refresh]);

  /** `volumes` is keyed by Core Audio ID. */
  return { data: devices, volumes, error, retry };
}

/** Ranked devices that are not connected, shown dimmed so they can still be reordered. */
function disconnectedRanked(priorities: PriorityEntry[], connected: AudioDevice[], ioType: IOType): AudioDevice[] {
  return priorities
    .filter(
      (entry) => !connected.some((d) => d.uid === entry.uid || normalizeName(d.name) === normalizeName(entry.name)),
    )
    .map((entry) => ({
      id: entry.uid,
      uid: entry.uid,
      name: entry.name,
      isInput: ioType === "input",
      isOutput: ioType === "output",
    }));
}

const fallbackIcon = (ioType: IOType) => (ioType === "input" ? Icon.Microphone : Icon.SpeakerOn);

export function DeviceList({ ioType }: { ioType: IOType }) {
  const audio = useAudioState(ioType);
  const store = useDeviceStore(ioType);

  // Device chosen in the list, shown as current until the system reports it (or the switch fails).
  const [selectedUid, setSelectedUid] = useState<string>();
  const reportedUid = audio.data?.current?.uid;
  useEffect(() => {
    if (selectedUid && reportedUid === selectedUid) setSelectedUid(undefined);
  }, [reportedUid, selectedUid]);
  const currentUid = selectedUid ?? reportedUid;

  // Select the current device when the list opens, then leave the selection to the user (refreshes must not move it).
  const [initialUid, setInitialUid] = useState<string>();
  useEffect(() => {
    if (!initialUid && reportedUid) setInitialUid(reportedUid);
  }, [initialUid, reportedUid]);

  // Mute changes made in the list, until the next volume read that differs.
  const [volumeChanges, setVolumeChanges] = useState<Record<string, Partial<VolumeInfo>>>({});
  useEffect(() => setVolumeChanges((prev) => (Object.keys(prev).length > 0 ? {} : prev)), [audio.volumes]);
  const updateVolume = useCallback(
    (uid: string, update: Partial<VolumeInfo>) =>
      setVolumeChanges((prev) => ({ ...prev, [uid]: { ...prev[uid], ...update } })),
    [],
  );

  const iconPool = getIconPool();
  const hidden = new Set(store.hidden);
  const connected = audio.data?.devices ?? [];
  const disconnected = disconnectedRanked(store.priorities, connected, ioType);
  const disconnectedUids = new Set(disconnected.map((d) => d.uid));
  const modeOf = (device: AudioDevice): ConnectMode => connectMode(ioType, device, store.connectModes);

  // Switch on Connect devices first (they win over every priority when they connect), then ranked devices in
  // priority order, then the rest; ties by name.
  const sortKey = (device: AudioDevice) => {
    const priority = priorityNumber(store.priorities, device.uid);
    if (priority !== undefined) return priority;
    return modeOf(device) === "switch" ? 0 : Number.MAX_SAFE_INTEGER;
  };
  const devices = [...connected, ...disconnected]
    .sort((a, b) => a.name.localeCompare(b.name))
    .sort((a, b) => sortKey(a) - sortKey(b))
    .filter((device) => store.isShowingHidden || !hidden.has(device.uid));

  // Reads keep failing while the last known devices are shown: say so once, not on every refresh.
  const hasData = !!audio.data;
  useEffect(() => {
    if (audio.error && hasData) {
      void showToast(Toast.Style.Failure, "Showing the last known devices", audio.error);
    }
  }, [audio.error, hasData]);

  // Every device is hidden (as opposed to: there are no devices at all).
  const onlyHidden = !store.isShowingHidden && connected.length + disconnected.length > 0;
  const isLoading = (!audio.data && !audio.error) || store.isLoading;

  if (!audio.data && audio.error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title={`Could not read ${ioType} devices`}
          description={audio.error}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={audio.retry} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Search ${ioType} devices…`} selectedItemId={initialUid}>
      {!isLoading && devices.length === 0 ? (
        <List.EmptyView
          title={onlyHidden ? "No visible devices" : `No ${ioType} devices`}
          description={onlyHidden ? "Hidden devices are not shown. Show them to manage them." : undefined}
          actions={
            <ActionPanel>
              <ToggleShowHiddenDevicesAction store={store} />
            </ActionPanel>
          }
        />
      ) : (
        devices.map((device) =>
          disconnectedUids.has(device.uid) ? (
            <DisconnectedDeviceItem key={device.uid} device={device} store={store} iconPool={iconPool} />
          ) : (
            <ConnectedDeviceItem
              key={device.uid}
              device={device}
              store={store}
              iconPool={iconPool}
              isCurrent={device.uid === currentUid}
              connectMode={modeOf(device)}
              volume={{ ...audio.volumes[device.id], ...volumeChanges[device.uid] }}
              onSelect={setSelectedUid}
              onVolumeChange={(update) => updateVolume(device.uid, update)}
            />
          ),
        )
      )}
    </List>
  );
}

type ItemProps = {
  device: AudioDevice;
  store: DeviceStore;
  iconPool: ReturnType<typeof getIconPool>;
};

function ConnectedDeviceItem(
  props: ItemProps & {
    isCurrent: boolean;
    connectMode: ConnectMode;
    volume: VolumeInfo;
    onSelect: (uid: string | undefined) => void;
    onVolumeChange: (update: Partial<VolumeInfo>) => void;
  },
) {
  const { device, store, isCurrent, volume } = props;
  const ioType = store.ioType;
  const meta = store.meta[device.uid];
  const isHidden = store.hidden.includes(device.uid);
  const icon = resolveDeviceIcon(props.iconPool, device, ioType, meta?.icon);
  const priorityProps = { device, store, connectMode: props.connectMode };

  return (
    <List.Item
      id={device.uid}
      title={displayName(device.name, meta)}
      keywords={[device.name]}
      subtitle={transportLabel(device)}
      icon={{
        source: icon ? deviceIconSource(isCurrent ? icon.filled : icon.outline) : fallbackIcon(ioType),
        // Hidden devices are dimmed like devices that are not connected.
        tintColor: isCurrent ? Color.Green : isHidden ? DISCONNECTED_TINT : Color.SecondaryText,
      }}
      accessories={getAccessories({
        ioType,
        isHidden,
        priority: priorityNumber(store.priorities, device.uid),
        isCurrent,
        isShowingHidden: store.isShowingHidden,
        volume,
        pinnedLevel: store.pinned.get(device.uid),
        connectMode: props.connectMode,
      })}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <SelectDeviceAction device={device} store={store} onSelect={props.onSelect} />
            {!isHidden && <SwitchOnConnectAction {...priorityProps} />}
            {!isHidden && <SetTopPriorityAction {...priorityProps} />}
          </ActionPanel.Section>
          {!isHidden && (
            <ActionPanel.Section>
              <PriorityOrderActions {...priorityProps} />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <PinVolumeAction device={device} store={store} volume={volume} />
            <ToggleMuteAction device={device} store={store} volume={volume} onChange={props.onVolumeChange} />
          </ActionPanel.Section>
          <DeviceManagementSection device={device} store={store} />
        </ActionPanel>
      }
    />
  );
}

function DisconnectedDeviceItem({ device, store, iconPool }: ItemProps) {
  const ioType = store.ioType;
  const meta = store.meta[device.uid];
  const isHidden = store.hidden.includes(device.uid);
  // Not connected: no transport type, so the default is the generic sound or microphone icon.
  const icon = resolveDeviceIcon(iconPool, device, ioType, meta?.icon);
  const priorityProps = { device, store };

  return (
    <List.Item
      id={device.uid}
      title={displayName(device.name, meta)}
      keywords={[device.name]}
      subtitle="Not connected"
      icon={{ source: icon ? deviceIconSource(icon.outline) : fallbackIcon(ioType), tintColor: DISCONNECTED_TINT }}
      accessories={getDisconnectedAccessories(
        priorityNumber(store.priorities, device.uid),
        isHidden,
        store.isShowingHidden,
      )}
      actions={
        <ActionPanel>
          {/* No "Select Device": the device is not connected. Enter opens Set Priority… instead. */}
          {!isHidden && (
            <>
              <ActionPanel.Section>
                <SetPriorityAction {...priorityProps} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <SwitchOnConnectAction {...priorityProps} />
                <SetTopPriorityAction {...priorityProps} />
                <MovePriorityActions {...priorityProps} />
              </ActionPanel.Section>
            </>
          )}
          <DeviceManagementSection device={device} store={store} />
        </ActionPanel>
      }
    />
  );
}

function DeviceManagementSection({ device, store }: { device: AudioDevice; store: DeviceStore }) {
  return (
    <ActionPanel.Section>
      <CustomizeDeviceAction device={device} store={store} />
      <ToggleHiddenDeviceAction device={device} store={store} />
      <ToggleShowHiddenDevicesAction store={store} />
    </ActionPanel.Section>
  );
}
