import { Action, ActionPanel, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatDeviceTitle } from "./lib/device-utils";
import { getStrings } from "./lib/i18n";
import { getSelectedDeviceIds, setSelectedDeviceIds } from "./lib/storage";
import { listDevices } from "./lib/tapo";
import { DeviceRecord, Prefs } from "./lib/types";

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const strings = getStrings(prefs);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [selectedIds, setSelectedIdsState] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [list, selected] = await Promise.all([listDevices(prefs), getSelectedDeviceIds()]);
      setDevices(list);
      setSelectedIdsState(new Set(selected));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function persist(next: Set<string>) {
    setSelectedIdsState(new Set(next));
    await setSelectedDeviceIds(Array.from(next));
    await showToast({ style: Toast.Style.Success, title: strings.selectionSaved });
  }

  async function toggleSelection(deviceId: string) {
    const next = new Set(selectedIds);
    if (next.has(deviceId)) next.delete(deviceId);
    else next.add(deviceId);
    await persist(next);
  }

  async function selectAll() {
    const next = new Set(devices.map((d) => d.id));
    await persist(next);
  }

  async function clearSelection() {
    await persist(new Set());
  }

  return (
    <List isLoading={loading} searchBarPlaceholder={strings.selectDevice}>
      <List.EmptyView title={strings.noDevicesFound} />
      {devices.map((device) => {
        const selected = selectedIds.has(device.id);
        return (
          <List.Item
            key={device.id}
            title={formatDeviceTitle(device)}
            subtitle={device.model}
            accessories={[{ tag: device.category }, { text: selected ? strings.selected : strings.notSelected }]}
            actions={
              <ActionPanel>
                <Action
                  title={selected ? strings.removeSelection : strings.addSelection}
                  onAction={() => toggleSelection(device.id)}
                />
                <Action title={strings.selectAll} onAction={selectAll} />
                <Action title={strings.clearSelection} onAction={clearSelection} />
                <Action title={strings.refresh} onAction={refresh} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
