import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { execSync } from "child_process";

function getDashboardUrl(): string {
  const { serverUrl } = getPreferenceValues<ExtensionPreferences>();
  return `${serverUrl.replace(/\/v1\/?$/, "")}/admin`;
}

interface SystemStats {
  cpu: {
    pCores: number;
    eCores: number;
    totalCores: number;
    loadAvg: [number, number, number];
  };
  gpu: {
    utilization: number;
    memoryInUse: number;
    memoryAllocated: number;
  };
  memory: {
    total: number;
    wired: number;
    active: number;
    compressed: number;
    free: number;
    used: number;
  };
  thermal: string;
  uptime: string;
}

function exec(cmd: string): string {
  try {
    return execSync(cmd, { timeout: 5000 }).toString().trim();
  } catch {
    return "";
  }
}

function parseMemory(): {
  total: number;
  wired: number;
  active: number;
  compressed: number;
  free: number;
  used: number;
} {
  const total = parseInt(exec("sysctl -n hw.memsize")) || 0;
  const pageSize = 16384;
  const vmstat = exec("vm_stat");
  const pages = (name: string): number => {
    const m = vmstat.match(new RegExp(`Pages ${name}:\\s+([\\d.]+)`));
    return m ? parseInt(m[1]) * pageSize : 0;
  };

  const free = pages("free");
  const active = pages("active");
  const wired = pages("wired down");
  const compressed = pages("occupied by compressor");
  const used = total - free;

  return { total, wired, active, compressed, free, used };
}

function parseGpu(): {
  utilization: number;
  memoryInUse: number;
  memoryAllocated: number;
} {
  const ioreg = exec("ioreg -r -d 1 -c IOAccelerator");
  const stat = (name: string): number => {
    const m = ioreg.match(new RegExp(`"${name}"=(\\d+)`));
    return m ? parseInt(m[1]) : 0;
  };
  return {
    utilization: stat("Device Utilization %"),
    memoryInUse: stat("In use system memory"),
    memoryAllocated: stat("Alloc system memory"),
  };
}

function parseCpu(): {
  pCores: number;
  eCores: number;
  totalCores: number;
  loadAvg: [number, number, number];
} {
  const pCores = parseInt(exec("sysctl -n hw.perflevel0.logicalcpu")) || 0;
  const eCores = parseInt(exec("sysctl -n hw.perflevel1.logicalcpu")) || 0;
  const totalCores = parseInt(exec("sysctl -n hw.ncpu")) || 0;
  const loadRaw = exec("sysctl -n vm.loadavg");
  const nums = loadRaw.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  return { pCores, eCores, totalCores, loadAvg: [nums[0], nums[1], nums[2]] };
}

function parseThermal(): string {
  const raw = exec("pmset -g therm 2>/dev/null");
  if (raw.includes("No thermal warning")) return "Nominal";
  if (raw.includes("thermal warning level")) return "Warning";
  return "Nominal";
}

function parseUptime(): string {
  const raw = exec("uptime");
  const m = raw.match(/up\s+(.+?),\s+\d+\s+user/);
  return m ? m[1].trim() : "—";
}

function fetchStats(): SystemStats {
  return {
    cpu: parseCpu(),
    gpu: parseGpu(),
    memory: parseMemory(),
    thermal: parseThermal(),
    uptime: parseUptime(),
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function SystemStatsCommand() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      setStats(fetchStats());
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to read system stats",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const actions = (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open Web Dashboard"
        url={getDashboardUrl()}
      />
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} />
    </ActionPanel>
  );

  if (!stats) return <List isLoading={isLoading} />;

  const s = stats;
  const memPercent =
    s.memory.total > 0 ? Math.round((s.memory.used / s.memory.total) * 100) : 0;
  const gpuMemGB = s.gpu.memoryInUse / 1024 ** 3;

  return (
    <List isLoading={isLoading}>
      <List.Section title="CPU">
        <List.Item
          icon={Icon.ComputerChip}
          title="P-cores"
          accessories={[{ text: `${s.cpu.pCores} cores` }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.ComputerChip}
          title="E-cores"
          accessories={[{ text: `${s.cpu.eCores} cores` }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.Gauge}
          title="Load Average"
          accessories={[
            { text: s.cpu.loadAvg.map((l) => l.toFixed(2)).join(" · ") },
          ]}
          actions={actions}
        />
      </List.Section>

      <List.Section title="GPU">
        <List.Item
          icon={Icon.ComputerChip}
          title="GPU Utilization"
          accessories={[
            {
              tag: {
                value: `${s.gpu.utilization}%`,
                color:
                  s.gpu.utilization > 80
                    ? Color.Red
                    : s.gpu.utilization > 40
                      ? Color.Yellow
                      : Color.Green,
              },
            },
          ]}
          actions={actions}
        />
        <List.Item
          icon={Icon.MemoryChip}
          title="GPU Memory"
          accessories={[{ text: `${gpuMemGB.toFixed(2)} GB in use` }]}
          actions={actions}
        />
      </List.Section>

      <List.Section title="Memory">
        <List.Item
          icon={Icon.MemoryChip}
          title="System Memory"
          accessories={[
            {
              text: `${formatBytes(s.memory.used)} / ${formatBytes(s.memory.total)}`,
            },
            {
              tag: {
                value: `${memPercent}%`,
                color:
                  memPercent > 80
                    ? Color.Red
                    : memPercent > 50
                      ? Color.Yellow
                      : Color.Green,
              },
            },
          ]}
          actions={actions}
        />
        <List.Item
          icon={Icon.CircleFilled}
          title="Wired"
          accessories={[{ text: formatBytes(s.memory.wired) }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.CircleFilled}
          title="Active"
          accessories={[{ text: formatBytes(s.memory.active) }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.CircleFilled}
          title="Compressed"
          accessories={[{ text: formatBytes(s.memory.compressed) }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.CircleFilled}
          title="Free"
          accessories={[{ text: formatBytes(s.memory.free) }]}
          actions={actions}
        />
      </List.Section>

      <List.Section title="System">
        <List.Item
          icon={Icon.Temperature}
          title="Thermal"
          accessories={[
            {
              tag: {
                value: s.thermal,
                color: s.thermal === "Nominal" ? Color.Green : Color.Red,
              },
            },
          ]}
          actions={actions}
        />
        <List.Item
          icon={Icon.Clock}
          title="Uptime"
          accessories={[{ text: s.uptime }]}
          actions={actions}
        />
      </List.Section>
    </List>
  );
}
