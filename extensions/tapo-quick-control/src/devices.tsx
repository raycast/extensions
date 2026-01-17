import {
  Action,
  ActionPanel,
  Detail,
  List,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { formatDeviceTitle, readDeviceOn, supportsPower } from "./lib/device-utils";
import { getStrings } from "./lib/i18n";
import { clearCache, getSelectedDeviceIds } from "./lib/storage";
import { getDeviceInfo, listDevices, setDevicePower } from "./lib/tapo";
import { DeviceRecord, Prefs } from "./lib/types";

type Row = {
  device: DeviceRecord;
  subtitle: string;
  statusLabel: string;
  resolvedIp?: string | null;
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
      const filtered =
        prefs.deviceScope === "selected" && selectedIds.length > 0
          ? devices.filter((d) => selectedIds.includes(d.id))
          : devices;

      if (filtered.length === 0) {
        setRows([]);
        return;
      }

      const nextRows = await mapLimit(filtered, 4, async (device) => {
        if (!supportsPower(device.category)) {
          const ipLabel = device.ip || strings.noIp;
          const subtitle = `${device.model} • ${ipLabel} • ${strings.statusUnknown}`;
          return { device, subtitle, statusLabel: strings.statusUnknown, resolvedIp: device.ip ?? null };
        }

        try {
          const { info, ip } = await getDeviceInfo(prefs, device);
          const isOn = readDeviceOn(info);
          const statusLabel = isOn === null ? strings.statusUnknown : isOn ? strings.on : strings.off;
          const ipLabel = ip || strings.noIp;
          const subtitle = `${device.model} • ${ipLabel} • ${statusLabel}`;
          return { device, subtitle, statusLabel, resolvedIp: ip };
        } catch (e) {
          const subtitle = `${device.model} • ${strings.errorPrefix}: ${e instanceof Error ? e.message : String(e)}`;
          return { device, subtitle, statusLabel: strings.statusUnknown, resolvedIp: null };
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
    <List isLoading={loading}>
      <List.EmptyView title={strings.noDevicesFound} />
      {rows.map((row) => (
        <List.Item
          key={row.device.id}
          title={formatDeviceTitle(row.device)}
          subtitle={row.subtitle}
          accessories={[{ tag: row.device.category }, { text: row.statusLabel }]}
          actions={
            <ActionPanel>
              {supportsPower(row.device.category) ? (
                <>
                  <Action title={strings.open} onAction={() => runPower(prefs, row.device, true, refresh, strings)} />
                  <Action title={strings.close} onAction={() => runPower(prefs, row.device, false, refresh, strings)} />
                </>
              ) : null}
              <Action.Push title={strings.showInfo} target={<DeviceDetail device={row.device} />} />
              <Action.CopyToClipboard title={strings.copyDeviceId} content={row.device.id} />
              {row.resolvedIp ? <Action.CopyToClipboard title={strings.copyIp} content={row.resolvedIp} /> : null}
              <Action title={strings.refresh} onAction={refresh} />
              <Action
                title={strings.clearCache}
                style={Action.Style.Destructive}
                onAction={async () => {
                  await clearCache();
                  await showToast({ style: Toast.Style.Success, title: strings.cacheCleared });
                  await refresh();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function DeviceDetail({ device }: { device: DeviceRecord }) {
  const prefs = getPreferenceValues<Prefs>();
  const strings = getStrings(prefs);
  const [infoMd, setInfoMd] = useState<string>(strings.deviceChecking);

  useEffect(() => {
    (async () => {
      if (!supportsPower(device.category)) {
        const payload = { source: "cloud", device };
        setInfoMd("```json\n" + JSON.stringify(payload, null, 2) + "\n```");
        return;
      }
      try {
        const { info, ip } = await getDeviceInfo(prefs, device);
        const payload = { ...info, resolvedIp: ip };
        setInfoMd("```json\n" + JSON.stringify(payload, null, 2) + "\n```");
      } catch (e) {
        setInfoMd(`${strings.errorPrefix}: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
  }, []);

  return <Detail markdown={infoMd} />;
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
