// The Output Device / Input Device list.
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
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
import { applyPriorities, pinnedVolumeDrifted, restorePinnedVolumes } from "./auto-switcher";
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
import type { PriorityEntry } from "./priority/decide";
import { resolveDeviceIcon } from "./priority/icon-pool";
import { priorityNumber, reconcile } from "./priority/list";
import { displayName } from "./priority/meta";

/** How often the open list re-reads devices and volumes, to show changes made outside the list. */
const REFRESH_MS = 2000;

/** `current` is missing when the direction has no devices. Volumes are keyed by Core Audio ID. */
type AudioState = { devices: AudioDevice[]; current?: AudioDevice; volumes: Record<string, VolumeInfo> };

async function readAudioState(ioType: IOType): Promise<AudioState> {
  const [{ devices, current }, volumes] = await Promise.all([getDeviceState(ioType), getAllVolumeInfo(ioType)]);
  return { devices, current, volumes };
}

/** The same object for the same content, so effects that depend on it do not run on every periodic read. */
function useStable<T>(value: T): T {
  const last = useRef<{ json: string; value: T }>(undefined);
  const json = JSON.stringify(value) ?? "";
  if (last.current?.json !== json) last.current = { json, value };
  return last.current.value;
}

/**
 * Devices, the current device and volumes, through `useCachedPromise`: the last result is cached so the list opens
 * without a spinner, and it is re-read every REFRESH_MS while the list is open (a device connects, macOS or Auto
 * Switch changes the device). `error` is the message of the last failed read, cleared by the next good one; it is
 * shown by the list, not as a toast on every failed read.
 */
function useAudioState(ioType: IOType, onPrioritiesApplied?: () => void) {
  const { data, error, isLoading, revalidate } = useCachedPromise(readAudioState, [ioType], {
    keepPreviousData: true,
    onError: (error) => console.error("Reading audio devices failed:", error),
  });

  // Periodic re-read; skipped while a read is still running.
  const loading = useRef(isLoading);
  loading.current = isLoading;
  useEffect(() => {
    const timer = setInterval(() => {
      if (!loading.current) revalidate();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [revalidate]);

  const devices = useStable(data ? { devices: data.devices, current: data.current } : undefined);
  const volumes = useStable(data?.volumes ?? {});

  // While the list is open, react to connects and disconnects at once instead of waiting for the background run
  // (about once a minute): run the same priority logic when the set of connected devices changes.
  const deviceSet = devices?.devices
    .map((d) => d.uid)
    .sort()
    .join("|");
  const lastSet = useRef<string | undefined>(undefined);
  const running = useRef(false);
  // A change seen while a run is in progress: run once more when it finishes, with the devices as they are then.
  const pending = useRef(false);
  // applyPriorities can store corrected UIDs (a USB device on another port): the list must re-read them.
  const onApplied = useRef(onPrioritiesApplied);
  onApplied.current = onPrioritiesApplied;
  const runPriorities = useCallback(() => {
    if (running.current) {
      pending.current = true;
      return;
    }
    running.current = true;
    applyPriorities(ioType)
      .then(() => {
        onApplied.current?.();
        revalidate();
      })
      .catch((error) => console.error("Applying priorities failed:", error))
      .finally(() => {
        running.current = false;
        if (pending.current) {
          pending.current = false;
          runPriorities();
        }
      });
  }, [ioType, revalidate]);
  useEffect(() => {
    if (!deviceSet || deviceSet === lastSet.current) return;
    const isFirst = lastSet.current === undefined;
    lastSet.current = deviceSet;
    if (!isFirst) runPriorities();
  }, [deviceSet, runPriorities]);

  return { data: devices, volumes, error: error ? errorMessage(error) : undefined, retry: revalidate };
}

/** Ranked devices that are not connected, shown dimmed so they can still be reordered. */
/** `priorities` must be reconciled with `connected` (UIDs that changed are already updated). */
function disconnectedRanked(priorities: PriorityEntry[], connected: AudioDevice[], ioType: IOType): AudioDevice[] {
  return priorities
    .filter((entry) => !connected.some((d) => d.uid === entry.uid))
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
  const store = useDeviceStore(ioType);
  const audio = useAudioState(ioType, store.reloadPriorities);

  // A ranked device that came back with a new UID (USB on another port) keeps its rank: store the new UID at once,
  // so the actions below work on it and do not add a second entry for the same device.
  const connectedDevices = audio.data?.devices;
  const reconciled = connectedDevices && !store.isLoading ? reconcile(store.priorities, connectedDevices) : undefined;
  const reconciledJson = reconciled && JSON.stringify(reconciled);
  const lastReconciled = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!reconciled || !reconciledJson || reconciledJson === JSON.stringify(store.priorities)) return;
    if (reconciledJson === lastReconciled.current) return; // already tried; a failed write is not retried in a loop
    lastReconciled.current = reconciledJson;
    store
      .changePriorities({ priorities: reconciled })
      .catch((error) => console.error("Saving priorities failed:", error));
    // Runs when the reconciled list changes; `reconciled` and `store` are read from that render.
  }, [reconciledJson]);

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

  // A pinned volume that changed (volume keys, another app) is set back at once while the list is open; otherwise
  // the background run does it within a minute.
  const pinnedKey = JSON.stringify([...store.pinned]);
  const restoring = useRef(false);
  useEffect(() => {
    if (restoring.current) return;
    const drifted = connected.some((device) => {
      const level = store.pinned.get(device.uid);
      const volume = audio.volumes[device.id]?.volume;
      return level != null && volume != null && pinnedVolumeDrifted(volume, level);
    });
    if (!drifted) return;
    restoring.current = true;
    restorePinnedVolumes(ioType)
      .then(audio.retry)
      .catch((error) => console.error("Restoring pinned volumes failed:", error))
      .finally(() => (restoring.current = false));
    // Runs when the volumes or the pinned levels change; the device list comes from the same render.
  }, [audio.volumes, pinnedKey]);

  // Reads keep failing while the last known devices are shown: say so once, not on every refresh.
  const hasData = !!audio.data;
  useEffect(() => {
    if (audio.error && hasData) {
      void showFailureToast(audio.error, { title: "Showing the last known devices" });
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
