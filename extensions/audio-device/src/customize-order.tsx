import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import type { AudioDevice } from "./audio-device";
import { getInputDevices, getOutputDevices } from "./audio-device";
import { applyAutoSwitchIfEnabled } from "./auto-switcher";
import { getTransportTypeLabel } from "./device-labels";
import { getIcon } from "./helpers";
import {
  applyDeviceOrder,
  getDeviceOrder,
  getHiddenDevices,
  isShowingHiddenDevices,
  normalizeDeviceOrder,
  setDeviceOrder,
  setHiddenDevices,
  setShowHiddenDevices,
} from "./device-preferences";

type IOType = "input" | "output";

const AUTO_SWITCH_DEBOUNCE_MS = 1000;

export default function Command() {
  const [ioType, setIoType] = useState<IOType>("output");
  const [order, setOrder] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = usePromise(
    async (type: IOType) => {
      const devices = await (type === "input" ? getInputDevices() : getOutputDevices());
      const storedOrder = await getDeviceOrder(type);
      const hiddenDevices = await getHiddenDevices(type);
      const showHiddenDevices = await isShowingHiddenDevices(type);
      return { devices, storedOrder, hiddenDevices, showHiddenDevices };
    },
    [ioType],
  );

  useEffect(() => {
    if (!data) return;
    const normalized = normalizeDeviceOrder(data.storedOrder, data.devices);
    setOrder(normalized);
    setHidden(data.hiddenDevices);
    setShowHidden(data.showHiddenDevices);
    if (normalized.join("|") !== data.storedOrder.join("|")) {
      void setDeviceOrder(ioType, normalized);
    }
  }, [data, ioType]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const devices = data?.devices ?? [];
  const orderedDevices = applyDeviceOrder(order, devices);
  const hiddenSet = new Set(hidden);
  const visibleDevices = orderedDevices.filter((device) => !hiddenSet.has(device.uid));
  const hiddenDevices = orderedDevices.filter((device) => hiddenSet.has(device.uid));
  const showEmptyView = !isLoading && visibleDevices.length === 0 && (!showHidden || hiddenDevices.length === 0);

  async function persistOrder(nextOrder: string[]) {
    setOrder(nextOrder);
    await setDeviceOrder(ioType, nextOrder);
    scheduleAutoSwitch(ioType);
  }

  async function moveDevice(deviceId: string, direction: "up" | "down" | "top" | "bottom") {
    const index = order.indexOf(deviceId);
    if (index === -1) return;
    const nextOrder = [...order];

    if (direction === "top") {
      nextOrder.splice(index, 1);
      nextOrder.unshift(deviceId);
    } else if (direction === "bottom") {
      nextOrder.splice(index, 1);
      nextOrder.push(deviceId);
    } else {
      const delta = direction === "up" ? -1 : 1;
      const nextIndex = index + delta;
      if (nextIndex < 0 || nextIndex >= nextOrder.length) return;
      nextOrder[index] = nextOrder[nextIndex];
      nextOrder[nextIndex] = deviceId;
    }

    await persistOrder(nextOrder);
  }

  async function hide(device: AudioDevice) {
    if (hidden.includes(device.uid)) return;
    const nextHidden = [...hidden, device.uid];
    setHidden(nextHidden);
    await setHiddenDevices(ioType, nextHidden);
    scheduleAutoSwitch(ioType);
  }

  async function show(device: AudioDevice) {
    if (!hidden.includes(device.uid)) return;
    const nextHidden = hidden.filter((id) => id !== device.uid);
    setHidden(nextHidden);
    await setHiddenDevices(ioType, nextHidden);
    scheduleAutoSwitch(ioType);
  }

  async function resetOrder() {
    const nextOrder = devices.map((device) => device.uid);
    await persistOrder(nextOrder);
    await showToast(Toast.Style.Success, "Order reset to system list");
  }

  async function toggleShowHidden() {
    const next = !showHidden;
    setShowHidden(next);
    await setShowHiddenDevices(ioType, next);
  }

  function scheduleAutoSwitch(type: IOType) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void applyAutoSwitchIfEnabled(type);
    }, AUTO_SWITCH_DEBOUNCE_MS);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Device type" value={ioType} onChange={(value) => setIoType(value as IOType)}>
          <List.Dropdown.Item title="Output devices" value="output" />
          <List.Dropdown.Item title="Input devices" value="input" />
        </List.Dropdown>
      }
    >
      {showEmptyView ? (
        <List.EmptyView
          title={showHidden ? "No devices found" : "No visible devices"}
          description={showHidden ? undefined : "Hidden devices are not shown. Toggle to manage hidden devices."}
          actions={
            <ActionPanel>
              <Action
                title={showHidden ? "Hide Hidden Devices" : "Show Hidden Devices"}
                icon={showHidden ? Icon.EyeDisabled : Icon.Eye}
                onAction={toggleShowHidden}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title="Visible Devices">
            {visibleDevices.map((device) => (
              <List.Item
                key={device.uid}
                title={device.name}
                icon={getIcon(device, false)}
                accessories={[{ text: getTransportTypeLabel(device) }]}
                actions={
                  <ActionPanel>
                    <Action title="Move up" icon={Icon.ArrowUp} onAction={() => moveDevice(device.uid, "up")} />
                    <Action title="Move Down" icon={Icon.ArrowDown} onAction={() => moveDevice(device.uid, "down")} />
                    <Action
                      title="Move to Top"
                      icon={Icon.ArrowUpCircle}
                      onAction={() => moveDevice(device.uid, "top")}
                    />
                    <Action
                      title="Move to Bottom"
                      icon={Icon.ArrowDownCircle}
                      onAction={() => moveDevice(device.uid, "bottom")}
                    />
                    <Action
                      title="Hide Device"
                      icon={Icon.EyeDisabled}
                      onAction={() => hide(device)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    />
                    <ActionPanel.Section>
                      <Action
                        title={showHidden ? "Hide Hidden Devices" : "Show Hidden Devices"}
                        icon={showHidden ? Icon.EyeDisabled : Icon.Eye}
                        onAction={toggleShowHidden}
                      />
                      <Action title="Reset Order" icon={Icon.ArrowClockwise} onAction={resetOrder} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          {showHidden && hiddenDevices.length > 0 && (
            <List.Section title="Hidden Devices">
              {hiddenDevices.map((device) => (
                <List.Item
                  key={device.uid}
                  title={device.name}
                  icon={getIcon(device, false)}
                  subtitle="Hidden"
                  actions={
                    <ActionPanel>
                      <Action title="Show Device" icon={Icon.Eye} onAction={() => show(device)} />
                      <ActionPanel.Section>
                        <Action
                          title={showHidden ? "Hide Hidden Devices" : "Show Hidden Devices"}
                          icon={showHidden ? Icon.EyeDisabled : Icon.Eye}
                          onAction={toggleShowHidden}
                        />
                        <Action title="Reset Order" icon={Icon.ArrowClockwise} onAction={resetOrder} />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
