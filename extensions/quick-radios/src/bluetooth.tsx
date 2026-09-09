import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { BluetoothDetail } from "./components/BluetoothDetail";
import {
  getBluetoothDevices,
  getBluetoothStatus,
  openBluetoothSettings,
  toggleBluetooth,
  toggleBluetoothDeviceConnection,
} from "./services/bluetoothService";
import { BluetoothDevice, BluetoothStatus } from "./services/types";

function areBluetoothDevicesEqual(
  a: BluetoothDevice[],
  b: BluetoothDevice[],
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function BluetoothCommand() {
  const [status, setStatus] = useState<BluetoothStatus>({ isOn: true });
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "connecting" | "disconnecting" | null
  >(null);

  const isMountedRef = useRef(true);
  const isScanningRef = useRef(false);
  const isActionInProgressRef = useRef(false);
  const pendingDeviceIdRef = useRef<string | null>(null);
  const actionSeqRef = useRef(0);
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const pendingRefreshRef = useRef<{ showNotification?: boolean } | null>(null);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    if (!isMountedRef.current) return;
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      if (isMountedRef.current) {
        fn();
      }
    }, ms);
    timeoutsRef.current.add(id);
    return id;
  }, []);

  const refresh = useCallback(
    async (
      options?:
        boolean | { showNotification?: boolean; isBackground?: boolean },
    ) => {
      const showNotification =
        typeof options === "boolean"
          ? options
          : Boolean(options?.showNotification);
      const isBackground =
        typeof options === "object" ? Boolean(options?.isBackground) : false;

      if (!isMountedRef.current) return;

      // Skip background periodic ticks while an action (toggle/connect/disconnect) is running
      if (isBackground && isActionInProgressRef.current) {
        return;
      }

      if (isScanningRef.current) {
        if (!isBackground) {
          pendingRefreshRef.current = {
            showNotification:
              showNotification || pendingRefreshRef.current?.showNotification,
          };
        }
        return;
      }

      isScanningRef.current = true;
      const currentSeq = actionSeqRef.current;
      if (!isBackground) {
        setIsLoading(true);
      }

      try {
        const [currentStatus, deviceList] = await Promise.all([
          getBluetoothStatus(),
          getBluetoothDevices(),
        ]);

        if (!isMountedRef.current || currentSeq !== actionSeqRef.current)
          return;

        setStatus((prev) =>
          prev.isOn === currentStatus.isOn ? prev : currentStatus,
        );
        setDevices((prev) => {
          const currentPending = pendingDeviceIdRef.current;
          if (currentPending) {
            const preserved = deviceList.map((d) => {
              if (d.id === currentPending) {
                const existing = prev.find((p) => p.id === currentPending);
                return existing
                  ? { ...d, isConnected: existing.isConnected }
                  : d;
              }
              return d;
            });
            return areBluetoothDevicesEqual(prev, preserved) ? prev : preserved;
          }
          return areBluetoothDevicesEqual(prev, deviceList) ? prev : deviceList;
        });

        if (showNotification && !isBackground) {
          await showToast({
            style: Toast.Style.Success,
            title: "Bluetooth refreshed",
          });
        }
      } catch (error) {
        if (!isMountedRef.current || currentSeq !== actionSeqRef.current)
          return;
        if (!isBackground) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to query Bluetooth",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        isScanningRef.current = false;
        if (isMountedRef.current && !isBackground) {
          setIsLoading(false);
        }

        if (isMountedRef.current && pendingRefreshRef.current) {
          const pending = pendingRefreshRef.current;
          pendingRefreshRef.current = null;
          refresh(pending);
        }
      }
    },
    [],
  );

  useEffect(() => {
    isMountedRef.current = true;
    refresh();

    const intervalId = setInterval(() => {
      refresh({ isBackground: true });
    }, 10000);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      for (const id of timeoutsRef.current) {
        clearTimeout(id);
      }
      timeoutsRef.current.clear();
    };
  }, [refresh]);

  async function handleToggleBluetooth() {
    actionSeqRef.current++;
    isActionInProgressRef.current = true;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${status.isOn ? "Turning Bluetooth Off..." : "Turning Bluetooth On..."}`,
    });
    try {
      const newState = await toggleBluetooth(!status.isOn);
      if (!isMountedRef.current) return;
      setStatus({ isOn: newState });
      toast.style = Toast.Style.Success;
      toast.title = `Bluetooth turned ${newState ? "ON" : "OFF"}`;
      scheduleTimeout(() => refresh({ isBackground: true }), 1500);
    } catch (error) {
      if (!isMountedRef.current) return;
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to toggle Bluetooth";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      isActionInProgressRef.current = false;
    }
  }

  async function handleToggleDevice(device: BluetoothDevice) {
    if (isActionInProgressRef.current) return;
    actionSeqRef.current++;
    isActionInProgressRef.current = true;
    const targetConnected = !device.isConnected;
    const actionName = targetConnected ? "Connecting" : "Disconnecting";

    // Instant 0ms optimistic UI update: move item and mark pending immediately
    pendingDeviceIdRef.current = device.id;
    setPendingDeviceId(device.id);
    setPendingAction(targetConnected ? "connecting" : "disconnecting");
    setDevices((prev) =>
      prev.map((d) =>
        d.id === device.id ? { ...d, isConnected: targetConnected } : d,
      ),
    );

    const toastPromise = showToast({
      style: Toast.Style.Animated,
      title: `${actionName} "${device.name}"...`,
    });

    try {
      await toggleBluetoothDeviceConnection(device.id, targetConnected);
      if (!isMountedRef.current) return;
      const toast = await toastPromise;
      toast.style = Toast.Style.Success;
      toast.title = `${targetConnected ? "Connected" : "Disconnected"} "${device.name}"`;
      scheduleTimeout(() => refresh({ isBackground: true }), 1000);
    } catch (error) {
      if (!isMountedRef.current) return;
      // Revert optimistic update upon failure
      setDevices((prev) =>
        prev.map((d) =>
          d.id === device.id ? { ...d, isConnected: !targetConnected } : d,
        ),
      );
      const toast = await toastPromise;
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to ${targetConnected ? "connect" : "disconnect"} "${device.name}"`;
      toast.message = error instanceof Error ? error.message : String(error);
      refresh({ isBackground: true });
    } finally {
      pendingDeviceIdRef.current = null;
      if (isMountedRef.current) {
        setPendingDeviceId(null);
        setPendingAction(null);
      }
      isActionInProgressRef.current = false;
    }
  }

  const connectedDevices = devices.filter((d) => d.isConnected);
  const audioDevices = devices.filter(
    (d) => !d.isConnected && d.category === "audio",
  );
  const inputDevices = devices.filter(
    (d) =>
      !d.isConnected &&
      (d.category === "controller" || d.category === "peripheral"),
  );
  const otherDevices = devices.filter(
    (d) =>
      !d.isConnected &&
      d.category !== "audio" &&
      d.category !== "controller" &&
      d.category !== "peripheral",
  );

  function renderDeviceItem(device: BluetoothDevice) {
    const isPending = pendingDeviceId === device.id;
    let iconSource: Icon = Icon.Bluetooth;
    let iconColor: Color = Color.SecondaryText;

    if (device.category === "audio") {
      iconSource = Icon.Headphones;
    } else if (device.category === "controller") {
      iconSource = Icon.GameController;
    } else if (device.category === "peripheral") {
      iconSource = Icon.Keyboard;
    }

    if (isPending) {
      iconColor = Color.Orange;
    } else if (device.isConnected) {
      iconColor = Color.Green;
    }

    return (
      <List.Item
        key={device.id}
        id={device.id}
        title={device.name}
        icon={{ source: iconSource, tintColor: iconColor }}
        accessories={
          isPending
            ? [
                {
                  tag: {
                    value:
                      pendingAction === "connecting"
                        ? "Connecting..."
                        : "Disconnecting...",
                    color: Color.Orange,
                  },
                  tooltip: `Operation in progress: ${pendingAction}`,
                },
              ]
            : device.isConnected
              ? [
                  {
                    icon: { source: Icon.CheckCircle, tintColor: Color.Green },
                    text: { value: "Connected", color: Color.Green },
                    tooltip: "Status: Connected",
                  },
                ]
              : [
                  {
                    tag: {
                      value: "Paired",
                      color: Color.SecondaryText,
                    },
                    tooltip: "Status: Paired",
                  },
                ]
        }
        detail={
          <BluetoothDetail
            device={device}
            isPending={isPending}
            pendingAction={pendingAction}
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title={
                  isPending
                    ? pendingAction === "connecting"
                      ? "Connecting..."
                      : "Disconnecting..."
                    : device.isConnected
                      ? "Disconnect Device"
                      : "Connect Device"
                }
                icon={
                  isPending
                    ? Icon.Clock
                    : device.isConnected
                      ? Icon.XMarkCircle
                      : Icon.Plug
                }
                onAction={() => !isPending && handleToggleDevice(device)}
              />
            </ActionPanel.Section>
            {device.address && (
              <ActionPanel.Section title="Device Details">
                <Action.CopyToClipboard
                  title="Copy Mac Address"
                  content={device.address}
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel.Section>
            )}
            <ActionPanel.Section title="Controls">
              <Action
                title={status.isOn ? "Turn Bluetooth Off" : "Turn Bluetooth On"}
                icon={Icon.Power}
                onAction={handleToggleBluetooth}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action
                title="Pair New Device in Settings"
                icon={Icon.Gear}
                onAction={openBluetoothSettings}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action
                title="Refresh List"
                icon={Icon.ArrowClockwise}
                onAction={() => refresh(true)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Filter Bluetooth devices by name..."
    >
      {!status.isOn ? (
        <List.EmptyView
          icon={{ source: Icon.Power, tintColor: Color.Red }}
          title="Bluetooth is Turned Off"
          description="Press Enter to turn Bluetooth on."
          actions={
            <ActionPanel>
              <Action
                title="Turn Bluetooth On"
                onAction={handleToggleBluetooth}
                icon={Icon.Power}
              />
              <Action
                title="Open Bluetooth Settings"
                onAction={openBluetoothSettings}
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      ) : devices.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={{ source: Icon.Bluetooth, tintColor: Color.SecondaryText }}
          title="No Paired Devices Found"
          description="Pair devices in your system settings to manage them here."
          actions={
            <ActionPanel>
              <Action
                title="Open Bluetooth Settings"
                onAction={openBluetoothSettings}
                icon={Icon.Gear}
              />
              <Action
                title="Turn Bluetooth Off"
                onAction={handleToggleBluetooth}
                icon={Icon.Power}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action
                title="Refresh List"
                onAction={() => refresh(true)}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {connectedDevices.length > 0 && (
            <List.Section title="Connected Devices">
              {connectedDevices.map(renderDeviceItem)}
            </List.Section>
          )}
          {audioDevices.length > 0 && (
            <List.Section title="Audio & Headphones">
              {audioDevices.map(renderDeviceItem)}
            </List.Section>
          )}
          {inputDevices.length > 0 && (
            <List.Section title="Keyboards, Mice & Controllers">
              {inputDevices.map(renderDeviceItem)}
            </List.Section>
          )}
          {otherDevices.length > 0 && (
            <List.Section title="Other Paired Devices">
              {otherDevices.map(renderDeviceItem)}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
