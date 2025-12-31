import { List, showToast, Toast, Icon, getPreferenceValues, Color } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import WebSocket from "ws";
import { getWebsocketCredentials } from "./api/pterodactyl";
import { Server } from "./api/types";
import * as asciichart from "asciichart";
import stripAnsi from "strip-ansi";

interface ServerStats {
  memory_bytes: number;
  memory_limit_bytes: number;
  cpu_absolute: number;
  network: {
    rx_bytes: number;
    tx_bytes: number;
  };
  state: string;
  disk_bytes: number;
}

const MAX_HISTORY = 40;

export default function ServerMonitor({ server }: { server: Server }) {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [history, setHistory] = useState<{
    cpu: number[];
    memory: number[];
    networkIn: number[];
    networkOut: number[];
  }>({
    cpu: new Array(MAX_HISTORY).fill(0),
    memory: new Array(MAX_HISTORY).fill(0),
    networkIn: new Array(MAX_HISTORY).fill(0),
    networkOut: new Array(MAX_HISTORY).fill(0),
  });

  const [isConnected, setIsConnected] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<"cpu" | "memory" | "network" | "disk">("cpu");
  const socketRef = useRef<WebSocket | null>(null);
  const lastNetRef = useRef<{ rx: number; tx: number } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function connect() {
      try {
        const { token, socket: socketUrl } = await getWebsocketCredentials(server.attributes.identifier);

        if (!isMounted) return;

        const preferences = getPreferenceValues();
        const origin = preferences.pterodactylUrl.endsWith("/")
          ? preferences.pterodactylUrl.slice(0, -1)
          : preferences.pterodactylUrl;

        const ws = new WebSocket(socketUrl, {
          headers: {
            Origin: origin,
          },
        });
        socketRef.current = ws;

        ws.on("open", () => {
          if (isMounted) setIsConnected(true);
          ws.send(JSON.stringify({ event: "auth", args: [token] }));
        });

        ws.on("message", (data) => {
          if (!isMounted) return;
          try {
            const parsed = JSON.parse(data.toString());
            if (parsed.event === "stats") {
              const statsData = JSON.parse(parsed.args[0]) as ServerStats;
              setStats(statsData);

              let rxDelta = 0;
              let txDelta = 0;

              if (lastNetRef.current) {
                const dRx = statsData.network.rx_bytes - lastNetRef.current.rx;
                const dTx = statsData.network.tx_bytes - lastNetRef.current.tx;
                rxDelta = dRx >= 0 ? dRx : 0;
                txDelta = dTx >= 0 ? dTx : 0;
              }

              lastNetRef.current = {
                rx: statsData.network.rx_bytes,
                tx: statsData.network.tx_bytes,
              };

              setHistory((prev) => {
                const newCpu = [...prev.cpu.slice(1), statsData.cpu_absolute];
                const newMem = [...prev.memory.slice(1), statsData.memory_bytes / 1024 / 1024];
                const newNetIn = [...prev.networkIn.slice(1), rxDelta / 1024];
                const newNetOut = [...prev.networkOut.slice(1), txDelta / 1024];

                return {
                  cpu: newCpu,
                  memory: newMem,
                  networkIn: newNetIn,
                  networkOut: newNetOut,
                };
              });
            } else if (parsed.event === "token expiring") {
              connect();
            }
          } catch {
            // ignore
          }
        });

        ws.on("error", (error) => {
          if (isMounted) {
            showToast({ style: Toast.Style.Failure, title: "WebSocket Error", message: String(error) });
            setIsConnected(false);
          }
        });

        ws.on("close", () => {
          if (isMounted) setIsConnected(false);
        });
      } catch (error) {
        if (isMounted) {
          showToast({ style: Toast.Style.Failure, title: "Failed to connect", message: String(error) });
        }
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, [server.attributes.identifier]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isLoading = !stats && !isConnected;

  const getUsageColor = (percent: number) => {
    if (percent > 90) return Color.Red;
    if (percent > 70) return Color.Orange;
    return Color.Green;
  };

  const renderChart = (data: number[], color: string, title: string, unit: string) => {
    const config = {
      height: 10,
      offset: 3,
      padding: "       ",
      format: function (x: number) {
        const padding = "       ";
        return (padding + x.toFixed(2)).slice(-padding.length);
      },
    };

    let chart = "";
    try {
      const rawChart = asciichart.plot(data, config);
      chart = stripAnsi(rawChart);
    } catch {
      chart = "Error generating chart";
    }

    return `
## ${title} History

\`\`\`text
${chart}
\`\`\`

**Current**: ${data[data.length - 1].toFixed(2)} ${unit}
`;
  };

  const memoryPercent = stats ? (stats.memory_bytes / stats.memory_limit_bytes) * 100 : 0;

  const DetailView = () => {
    let markdown = "";

    if (selectedMetric === "cpu") {
      markdown = renderChart(history.cpu, "blue", "CPU Usage", "%");
    } else if (selectedMetric === "memory") {
      markdown = renderChart(history.memory, "green", "Memory Usage", "MB");
    } else if (selectedMetric === "network") {
      const inChart = renderChart(history.networkIn, "green", "Input (Download)", "KB/s");
      const outChartBlock = renderChart(history.networkOut, "blue", "Output (Upload)", "KB/s");

      markdown = `
${inChart}

---

${outChartBlock}
`;
    } else if (selectedMetric === "disk") {
      markdown = `
## Disk Usage

**Used**: ${stats ? formatBytes(stats.disk_bytes) : "---"}
`;
    } else {
      markdown = "Select a metric to view history.";
    }

    return <List.Item.Detail markdown={markdown} />;
  };

  return (
    <List
      navigationTitle={`Monitor: ${server.attributes.name}`}
      isLoading={isLoading}
      isShowingDetail={true}
      onSelectionChange={(id) => {
        if (id) setSelectedMetric(id as "cpu" | "memory" | "network" | "disk");
      }}
    >
      {stats ? (
        <>
          <List.Item
            id="status"
            title="Status"
            icon={{ source: Icon.Circle, tintColor: stats.state === "running" ? Color.Green : Color.Red }}
            accessories={[{ text: stats.state.toUpperCase() }]}
            detail={<List.Item.Detail markdown={`# Server Status: ${stats.state.toUpperCase()}`} />}
          />

          <List.Item
            id="cpu"
            title="CPU Usage"
            icon={Icon.Desktop}
            accessories={[
              { text: `${stats.cpu_absolute.toFixed(2)}%` },
              { icon: { source: Icon.Circle, tintColor: getUsageColor(stats.cpu_absolute) } },
            ]}
            detail={<DetailView />}
          />

          <List.Item
            id="memory"
            title="Memory Usage"
            icon={Icon.MemoryChip}
            subtitle={`${formatBytes(stats.memory_bytes)} / ${formatBytes(stats.memory_limit_bytes)}`}
            accessories={[
              { text: `${memoryPercent.toFixed(1)}%` },
              { icon: { source: Icon.Circle, tintColor: getUsageColor(memoryPercent) } },
            ]}
            detail={<DetailView />}
          />

          <List.Item
            id="disk"
            title="Disk Usage"
            icon={Icon.HardDrive}
            accessories={[{ text: formatBytes(stats.disk_bytes) }]}
            detail={<DetailView />}
          />

          <List.Item
            id="network"
            title="Network"
            icon={Icon.Globe}
            subtitle={`↓ ${formatBytes(stats.network.rx_bytes)} | ↑ ${formatBytes(stats.network.tx_bytes)}`}
            detail={<DetailView />}
          />
        </>
      ) : (
        <List.EmptyView title="Waiting for stats..." icon={Icon.Clock} />
      )}
    </List>
  );
}
