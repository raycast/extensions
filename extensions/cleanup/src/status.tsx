import { useEffect, useState } from "react";
import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import os from "os";

let si: typeof import("systeminformation") | null = null;

(async () => {
  try {
    si = await import("systeminformation");
  } catch {
    // systeminformation not available
  }
})();

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

async function getStatus(): Promise<Array<{ key: string; value: string }>> {
  try {
    const items: Array<{ key: string; value: string }> = [];
    items.push({ key: "Hostname", value: os.hostname() });
    items.push({ key: "Platform", value: `${os.platform()} ${os.arch()}` });
    items.push({ key: "Uptime", value: `${Math.floor(os.uptime() / 60)} min` });
    items.push({ key: "CPU", value: os.cpus()[0]?.model || "" });
    items.push({ key: "Cores", value: `${os.cpus().length}` });
    items.push({
      key: "Memory",
      value: `${formatBytes(os.totalmem() - os.freemem())} / ${formatBytes(os.totalmem())}`,
    });

    // systeminformation (需安装 systeminformation 依赖)
    if (si) {
      const [cpu, mem, disk, net, battery] = await Promise.all([
        si.currentLoad().catch(() => null),
        si.mem().catch(() => null),
        si.fsSize().catch(() => null),
        si.networkStats().catch(() => null),
        si.battery().catch(() => null),
      ]);
      if (cpu) items.push({ key: "CPU Usage", value: `${cpu.currentLoad.toFixed(1)} %` });
      if (mem) items.push({ key: "Memory Usage", value: `${formatBytes(mem.active)} / ${formatBytes(mem.total)}` });
      if (disk && Array.isArray(disk)) {
        disk.forEach((d: { mount: string; used: number; size: number }) =>
          items.push({ key: `Disk (${d.mount})`, value: `${formatBytes(d.used)} / ${formatBytes(d.size)}` }),
        );
      }
      if (net && Array.isArray(net)) {
        net.forEach((n: { iface: string; rx_sec: number; tx_sec: number }, i: number) =>
          items.push({
            key: `Net (${n.iface || i})`,
            value: `↓${(n.rx_sec / 1024).toFixed(1)}KB/s ↑${(n.tx_sec / 1024).toFixed(1)}KB/s`,
          }),
        );
      }
      if (battery && battery.hasBattery) {
        items.push({ key: "Battery", value: `${battery.percent}% ${battery.isCharging ? "(Charging)" : ""}` });
      }
    }
    return items;
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to get status", message: String(error) });
    return [];
  }
}

export default function StatusMonitor() {
  const [items, setItems] = useState<{ key: string; value: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    setItems(await getStatus());
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search status...">
      {items.map((item) => (
        <List.Item
          key={item.key}
          title={item.key}
          subtitle={item.value}
          actions={
            <ActionPanel>
              <Action title="Refresh Now" onAction={refresh} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
