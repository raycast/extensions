import { Action, ActionPanel, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatDeviceTitle, readDeviceOn } from "./lib/device-utils";
import { getStrings } from "./lib/i18n";
import { getSelectedDeviceIds } from "./lib/storage";
import { getDeviceInfo, listDevices, setDevicePower } from "./lib/tapo";
import { DeviceRecord, Prefs } from "./lib/types";

type Row = {
  device: DeviceRecord;
  subtitle: string;
  statusLabel: string;
};

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const strings = getStrings(prefs);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const devices = await listDevices(prefs);
      const selectedIds = await getSelectedDeviceIds();
      const plugs = devices.filter((d) => d.category === "plug");
      const filtered =
        prefs.deviceScope === "selected" && selectedIds.length > 0
          ? plugs.filter((d) => selectedIds.includes(d.id))
          : plugs;

      const nextRows = await mapLimit(filtered, 4, async (device) => {
        try {
          const { info, ip } = await getDeviceInfo(prefs, device);
          const isOn = readDeviceOn(info);
          const statusLabel = isOn === null ? strings.statusUnknown : isOn ? strings.on : strings.off;
          const ipLabel = ip || strings.noIp;
          const subtitle = `${device.model} • ${ipLabel} • ${statusLabel}`;
          return { device, subtitle, statusLabel };
        } catch (e) {
          const subtitle = `${device.model} • ${strings.errorPrefix}: ${e instanceof Error ? e.message : String(e)}`;
          return { device, subtitle, statusLabel: strings.statusUnknown };
        }
      });

      setRows(nextRows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <List isLoading={loading} searchBarPlaceholder={strings.plugTitle}>
      <List.EmptyView title={strings.noDevicesFound} />
      {rows.map((row) => (
        <List.Item
          key={row.device.id}
          title={formatDeviceTitle(row.device)}
          subtitle={row.subtitle}
          accessories={[{ text: row.statusLabel }]}
          actions={
            <ActionPanel>
              <Action title={strings.open} onAction={() => runPower(prefs, row.device, true, refresh, strings)} />
              <Action title={strings.close} onAction={() => runPower(prefs, row.device, false, refresh, strings)} />
              <Action title={strings.refresh} onAction={refresh} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function runPower(
  prefs: Prefs,
  device: DeviceRecord,
  on: boolean,
  refresh: () => Promise<void>,
  strings: ReturnType<typeof getStrings>,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: on ? strings.opening : strings.closing });
  try {
    await setDevicePower(prefs, device, on);
    toast.style = Toast.Style.Success;
    toast.title = on ? strings.opened : strings.closed;
    await refresh();
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = strings.failed;
    toast.message = e instanceof Error ? e.message : String(e);
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await fn(items[current]);
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => worker());
  await Promise.all(workers);
  return results;
}
