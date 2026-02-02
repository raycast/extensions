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
  getDisabledDevices,
  normalizeDeviceOrder,
  setDeviceOrder,
  setDisabledDevices,
} from "./device-preferences";

type IOType = "input" | "output";

const AUTO_SWITCH_DEBOUNCE_MS = 1000;

export default function Command() {
  const [ioType, setIoType] = useState<IOType>("output");
  const [order, setOrder] = useState<string[]>([]);
  const [disabled, setDisabled] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = usePromise(
    async (type: IOType) => {
      const devices = await (type === "input" ? getInputDevices() : getOutputDevices());
      const storedOrder = await getDeviceOrder(type);
      const disabledDevices = await getDisabledDevices();
      return { devices, storedOrder, disabledDevices };
    },
    [ioType],
  );

  useEffect(() => {
    if (!data) return;
    const normalized = normalizeDeviceOrder(data.storedOrder, data.devices);
    setOrder(normalized);
    setDisabled(data.disabledDevices);
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
  const disabledSet = new Set(disabled);
  const enabledDevices = orderedDevices.filter((device) => !disabledSet.has(device.uid));
  const disabledDevices = orderedDevices.filter((device) => disabledSet.has(device.uid));

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

  async function disable(device: AudioDevice) {
    if (disabled.includes(device.uid)) return;
    const nextDisabled = [...disabled, device.uid];
    setDisabled(nextDisabled);
    await setDisabledDevices(nextDisabled);
    scheduleAutoSwitch(ioType);
  }

  async function enable(device: AudioDevice) {
    if (!disabled.includes(device.uid)) return;
    const nextDisabled = disabled.filter((id) => id !== device.uid);
    setDisabled(nextDisabled);
    await setDisabledDevices(nextDisabled);
    scheduleAutoSwitch(ioType);
  }

  async function resetOrder() {
    const nextOrder = devices.map((device) => device.uid);
    await persistOrder(nextOrder);
    await showToast(Toast.Style.Success, "Order reset to system list");
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
      <List.Section title="Enabled Devices">
        {enabledDevices.map((device) => (
          <List.Item
            key={device.uid}
            title={device.name}
            icon={getIcon(device, false)}
            accessories={[{ text: getTransportTypeLabel(device) }]}
            actions={
              <ActionPanel>
                <Action title="Move Up" icon={Icon.ArrowUp} onAction={() => moveDevice(device.uid, "up")} />
                <Action title="Move Down" icon={Icon.ArrowDown} onAction={() => moveDevice(device.uid, "down")} />
                <Action title="Move to Top" icon={Icon.ArrowUpCircle} onAction={() => moveDevice(device.uid, "top")} />
                <Action
                  title="Move to Bottom"
                  icon={Icon.ArrowDownCircle}
                  onAction={() => moveDevice(device.uid, "bottom")}
                />
                <Action
                  title="Disable Device"
                  icon={Icon.EyeDisabled}
                  onAction={() => disable(device)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                />
                <ActionPanel.Section>
                  <Action title="Reset Order" icon={Icon.ArrowClockwise} onAction={resetOrder} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {disabledDevices.length > 0 && (
        <List.Section title="Disabled Devices">
          {disabledDevices.map((device) => (
            <List.Item
              key={device.uid}
              title={device.name}
              icon={getIcon(device, false)}
              subtitle="Disabled"
              actions={
                <ActionPanel>
                  <Action title="Enable Device" icon={Icon.Eye} onAction={() => enable(device)} />
                  <ActionPanel.Section>
                    <Action title="Reset Order" icon={Icon.ArrowClockwise} onAction={resetOrder} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
