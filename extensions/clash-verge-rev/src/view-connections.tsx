import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  List,
  Icon,
  Color,
  Action,
  ActionPanel,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  getPreferenceValues,
} from "@raycast/api";
import {
  getConnectionStreamConfig,
  closeConnection,
  closeAllConnections,
  getProxies,
} from "./utils/api";
import fetch from "node-fetch";

interface Preferences {
  secret?: string;
  defaultSortOrder?: string;
}

interface ConnectionItem {
  id: string;
  metadata: {
    network: string;
    type: string;
    sourceIP: string;
    sourcePort: string;
    destinationIP: string;
    destinationPort: string;
    host: string;
    processPath: string;
    specialProxy: string;
  };
  upload: number;
  download: number;
  start: string;
  chains: string[];
  rule: string;
  rulePayload: string;
}

interface Speed {
  up: number;
  down: number;
}

type SortOption =
  | "downSpeed"
  | "upSpeed"
  | "download"
  | "upload"
  | "time"
  | "host";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

export default function ViewConnections() {
  const prefs = getPreferenceValues<Preferences>();
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [speeds, setSpeeds] = useState<Record<string, Speed>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [showDetail, setShowDetail] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>(
    (prefs.defaultSortOrder as SortOption) || "downSpeed",
  );

  // Store previous snapshot to calculate speed
  const prevConnectionsRef = useRef<Record<string, ConnectionItem>>({});
  const prevGlobalRef = useRef<{ down: number; up: number } | null>(null);
  const lastSnapshotTimeRef = useRef<number>(Date.now());
  const wsRef = useRef<WebSocket | null>(null);

  // State for global traffic stats
  const [traffic, setTraffic] = useState({
    upSpeed: 0,
    downSpeed: 0,
    totalUp: 0,
    totalDown: 0,
  });

  const connect = useCallback(() => {
    // Clean up previous connection if exists
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const streamConfig = getConnectionStreamConfig();
      console.log("[Connections] Stream config:", {
        url: streamConfig.url,
        usePolling: streamConfig.usePolling,
      });

      // macOS with Unix socket: use HTTP polling instead of WebSocket
      if (streamConfig.usePolling) {
        setIsConnected(true);
        setErrorMsg(null);
        prevGlobalRef.current = null;
        lastSnapshotTimeRef.current = Date.now();

        const pollInterval = streamConfig.pollInterval || 1000;
        const pollUrl = streamConfig.url;
        const pollHeaders = streamConfig.headers;
        const pollAgent = streamConfig.agent;

        const poll = async () => {
          try {
            const fetchOpts: Record<string, unknown> = {
              method: "GET",
              headers: pollHeaders,
            };
            if (pollAgent) {
              fetchOpts.agent = pollAgent;
            }
            const res = await fetch(pollUrl, fetchOpts);
            if (!res.ok) return;

            const data = (await res.json()) as Record<string, unknown>;
            if (data.connections) {
              const newConnections = data.connections as ConnectionItem[];
              const now = Date.now();
              const timeDiff = (now - lastSnapshotTimeRef.current) / 1000;

              // Calculate per-connection speed
              if (timeDiff > 0) {
                const newSpeeds: Record<string, Speed> = {};
                newConnections.forEach((conn) => {
                  const prev = prevConnectionsRef.current[conn.id];
                  if (prev) {
                    const downSpeed = (conn.download - prev.download) / timeDiff;
                    const upSpeed = (conn.upload - prev.upload) / timeDiff;
                    newSpeeds[conn.id] = {
                      down: Math.max(0, downSpeed),
                      up: Math.max(0, upSpeed),
                    };
                  } else {
                    newSpeeds[conn.id] = { down: 0, up: 0 };
                  }
                });
                setSpeeds(newSpeeds);
              }

              // Calculate global speed
              const currentTotalDown = (data.downloadTotal as number) || 0;
              const currentTotalUp = (data.uploadTotal as number) || 0;
              let globalDownSpeed = 0;
              let globalUpSpeed = 0;

              if (prevGlobalRef.current && timeDiff > 0) {
                globalDownSpeed = Math.max(
                  0,
                  (currentTotalDown - prevGlobalRef.current.down) / timeDiff,
                );
                globalUpSpeed = Math.max(
                  0,
                  (currentTotalUp - prevGlobalRef.current.up) / timeDiff,
                );
              }

              setTraffic({
                downSpeed: globalDownSpeed,
                upSpeed: globalUpSpeed,
                totalDown: currentTotalDown,
                totalUp: currentTotalUp,
              });

              // Update refs
              const newConnMap: Record<string, ConnectionItem> = {};
              newConnections.forEach((c) => (newConnMap[c.id] = c));
              prevConnectionsRef.current = newConnMap;
              prevGlobalRef.current = {
                down: currentTotalDown,
                up: currentTotalUp,
              };
              lastSnapshotTimeRef.current = now;

              setConnections(newConnections);
            }
          } catch {
            // Poll errors are non-fatal; next poll will retry
          }
        };

        // Start polling loop
        const pollLoop = () => {
          let timer: ReturnType<typeof setTimeout>;
          if (wsRef.current) {
            // Reuse wsRef to track the polling timer
            wsRef.current = { close: () => clearTimeout(timer) } as unknown as WebSocket;
          }
          const runPoll = () => {
            poll().then(() => {
              timer = setTimeout(runPoll, pollInterval);
              wsRef.current = { close: () => clearTimeout(timer) } as unknown as WebSocket;
            });
          };
          runPoll();
        };
        pollLoop();
        return;
      }

      // Windows or macOS with TCP: use WebSocket
      const { url } = streamConfig;
      console.log("[Connections] Connecting to WebSocket:", url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (ws !== wsRef.current) return;
        console.log("[Connections] Connected");
        setIsConnected(true);
        setErrorMsg(null);
        // Reset refs on new connection
        prevGlobalRef.current = null;
        lastSnapshotTimeRef.current = Date.now();
      };

      ws.onmessage = (event) => {
        if (ws !== wsRef.current) return;
        try {
          const data = JSON.parse(event.data);
          // data structure: { downloadTotal, uploadTotal, connections: [...] }
          if (data.connections) {
            const newConnections = data.connections as ConnectionItem[];
            const now = Date.now();
            const timeDiff = (now - lastSnapshotTimeRef.current) / 1000; // in seconds

            // 1. Calculate Per-Connection Speed (for sorting/display)
            if (timeDiff > 0) {
              const newSpeeds: Record<string, Speed> = {};
              newConnections.forEach((conn) => {
                const prev = prevConnectionsRef.current[conn.id];
                if (prev) {
                  const downSpeed = (conn.download - prev.download) / timeDiff;
                  const upSpeed = (conn.upload - prev.upload) / timeDiff;
                  newSpeeds[conn.id] = {
                    down: Math.max(0, downSpeed),
                    up: Math.max(0, upSpeed),
                  };
                } else {
                  newSpeeds[conn.id] = { down: 0, up: 0 };
                }
              });
              setSpeeds(newSpeeds);
            }

            // 2. Calculate Global Speed & Volume
            const currentTotalDown = data.downloadTotal || 0;
            const currentTotalUp = data.uploadTotal || 0;

            let globalDownSpeed = 0;
            let globalUpSpeed = 0;

            if (prevGlobalRef.current && timeDiff > 0) {
              globalDownSpeed = Math.max(
                0,
                (currentTotalDown - prevGlobalRef.current.down) / timeDiff,
              );
              globalUpSpeed = Math.max(
                0,
                (currentTotalUp - prevGlobalRef.current.up) / timeDiff,
              );

              // Debug logs
              if (globalDownSpeed > 1024 * 1024 * 100) {
                // Log if > 100MB/s (suspicious)
                console.log("[Debug] Suspicious Speed:", {
                  currentTotalDown,
                  prevTotalDown: prevGlobalRef.current.down,
                  diff: currentTotalDown - prevGlobalRef.current.down,
                  timeDiff,
                  calculatedSpeed: globalDownSpeed,
                });
              }
            }

            setTraffic({
              downSpeed: globalDownSpeed,
              upSpeed: globalUpSpeed,
              totalDown: currentTotalDown,
              totalUp: currentTotalUp,
            });

            // Update refs
            const newConnMap: Record<string, ConnectionItem> = {};
            newConnections.forEach((c) => (newConnMap[c.id] = c));
            prevConnectionsRef.current = newConnMap;
            prevGlobalRef.current = {
              down: currentTotalDown,
              up: currentTotalUp,
            };
            lastSnapshotTimeRef.current = now;

            // Update connections state
            setConnections(newConnections);
          }
        } catch (err) {
          console.error("Parse error", err);
        }
      };

      ws.onclose = () => {
        if (ws !== wsRef.current) return;
        console.log("[Connections] Closed");
        setIsConnected(false);
      };

      ws.onerror = (err) => {
        if (ws !== wsRef.current) return;
        console.error("[Connections] Error", err);
        setErrorMsg("Connection Failed");
        setIsConnected(false);
      };
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const handleCloseConnection = async (id: string) => {
    try {
      await closeConnection(id);
      showToast(Toast.Style.Success, "Connection closed");
      // Optimistically remove from list
      setConnections((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      showToast(Toast.Style.Failure, "Failed to close connection");
    }
  };

  const handleCloseAll = async () => {
    if (
      await confirmAlert({
        title: "Close All Connections",
        message: "Are you sure you want to close all active connections?",
        primaryAction: {
          title: "Close All",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await closeAllConnections();
        showToast(Toast.Style.Success, "All connections closed");
        setConnections([]);
      } catch (err) {
        showToast(Toast.Style.Failure, "Failed to close all connections");
      }
    }
  };

  // Sort Connections
  const sortedConnections = useMemo(() => {
    return [...connections].sort((a, b) => {
      switch (sortBy) {
        case "downSpeed": {
          const speedA = speeds[a.id]?.down || 0;
          const speedB = speeds[b.id]?.down || 0;
          return speedB - speedA;
        }
        case "upSpeed": {
          const speedA = speeds[a.id]?.up || 0;
          const speedB = speeds[b.id]?.up || 0;
          return speedB - speedA;
        }
        case "download":
          return b.download - a.download;
        case "upload":
          return b.upload - a.upload;
        case "time":
          return new Date(b.start).getTime() - new Date(a.start).getTime();
        case "host": {
          const hostA = a.metadata.host || a.metadata.destinationIP || "";
          const hostB = b.metadata.host || b.metadata.destinationIP || "";
          return hostA.localeCompare(hostB);
        }
        default:
          return 0;
      }
    });
  }, [connections, speeds, sortBy]);

  // Sort Options Definition
  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "downSpeed", label: "Download Speed" },
    { value: "upSpeed", label: "Upload Speed" },
    { value: "download", label: "Total Download" },
    { value: "upload", label: "Total Upload" },
    { value: "time", label: "Start Time" },
    { value: "host", label: "Host Name" },
  ];

  const cycleSort = (direction: 1 | -1) => {
    const currentIndex = SORT_OPTIONS.findIndex((opt) => opt.value === sortBy);
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = SORT_OPTIONS.length - 1;
    if (newIndex >= SORT_OPTIONS.length) newIndex = 0;
    setSortBy(SORT_OPTIONS[newIndex].value);
    showToast(Toast.Style.Success, `Sorted by ${SORT_OPTIONS[newIndex].label}`);
  };

  return (
    <List
      isLoading={!errorMsg && !isConnected && connections.length === 0}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Filter connections..."
      navigationTitle={
        isConnected
          ? `Speed: ↓ ${formatSpeed(traffic.downSpeed)} ↑ ${formatSpeed(traffic.upSpeed)}  |  Total: ↓ ${formatBytes(traffic.totalDown)} ↑ ${formatBytes(traffic.totalUp)}`
          : "View Connections"
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          onChange={(newValue) => setSortBy(newValue as SortOption)}
          value={sortBy}
        >
          {SORT_OPTIONS.map((opt) => (
            <List.Dropdown.Item
              key={opt.value}
              title={opt.label}
              value={opt.value}
              icon={
                opt.value === "downSpeed"
                  ? Icon.Download
                  : opt.value === "upSpeed"
                    ? Icon.Upload
                    : opt.value === "time"
                      ? Icon.Clock
                      : opt.value === "host"
                        ? Icon.Globe
                        : undefined
              }
            />
          ))}
        </List.Dropdown>
      }
    >
      {errorMsg ? (
        <List.EmptyView
          title="Connection Error"
          description={errorMsg}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                onAction={connect}
                icon={Icon.RotateAntiClockwise}
              />
            </ActionPanel>
          }
        />
      ) : sortedConnections.length === 0 ? (
        <List.EmptyView
          title={isConnected ? "No Active Connections" : "Connecting..."}
          icon={isConnected ? Icon.CheckCircle : Icon.Wifi}
        />
      ) : (
        <List.Section
          title="Active Connections"
          subtitle={`${sortedConnections.length} connections`}
        >
          {sortedConnections.map((conn) => {
            const speed = speeds[conn.id] || { down: 0, up: 0 };
            const host = conn.metadata.host || conn.metadata.destinationIP;
            const chains = conn.chains.slice().reverse().join(" :: "); // Show path

            return (
              <List.Item
                key={conn.id}
                title={host}
                subtitle={showDetail ? "" : conn.rulePayload || conn.rule}
                icon={
                  conn.metadata.network === "tcp"
                    ? { source: Icon.Globe, tintColor: Color.SecondaryText }
                    : { source: Icon.Bolt, tintColor: Color.SecondaryText }
                }
                accessories={
                  showDetail
                    ? undefined
                    : [
                        {
                          text: `↓ ${formatSpeed(speed.down)}`,
                        },
                        {
                          text: `↑ ${formatSpeed(speed.up)}`,
                        },
                      ]
                }
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Host"
                          text={host}
                          icon={Icon.Globe}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Process"
                          text={conn.metadata.processPath}
                          icon={Icon.Finder}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.TagList title="Network">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={conn.metadata.network.toUpperCase()}
                            color={Color.Blue}
                          />
                          <List.Item.Detail.Metadata.TagList.Item
                            text={conn.metadata.type}
                            color={Color.SecondaryText}
                          />
                        </List.Item.Detail.Metadata.TagList>

                        <List.Item.Detail.Metadata.Label
                          title="Source"
                          text={`${conn.metadata.sourceIP}:${conn.metadata.sourcePort}`}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Destination"
                          text={`${conn.metadata.destinationIP}:${conn.metadata.destinationPort}`}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Download Speed"
                          text={formatSpeed(speed.down)}
                          icon={Icon.Download}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Upload Speed"
                          text={formatSpeed(speed.up)}
                          icon={Icon.Upload}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Total Download"
                          text={formatBytes(conn.download)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Total Upload"
                          text={formatBytes(conn.upload)}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Rule"
                          text={`${conn.rule} (${conn.rulePayload})`}
                          icon={Icon.Filter}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Chains"
                          text={chains}
                          icon={Icon.Link}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Start Time"
                          text={new Date(conn.start).toLocaleString()}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title={showDetail ? "List View" : "Detail View"}
                      icon={showDetail ? Icon.List : Icon.Sidebar}
                      onAction={() => setShowDetail(!showDetail)}
                    />
                    <Action
                      title="Close Connection (Ctrl+X)"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      shortcut={{ macOS: { modifiers: ["cmd"], key: "x" }, Windows: { modifiers: ["ctrl"], key: "x" } }}
                      onAction={() => handleCloseConnection(conn.id)}
                    />
                    <Action
                      title="Close All Connections"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ macOS: { modifiers: ["cmd", "shift"], key: "x" }, Windows: { modifiers: ["ctrl", "shift"], key: "x" } }}
                      onAction={handleCloseAll}
                    />
                    <Action.CopyToClipboard
                      title="Copy Host"
                      content={host}
                      shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Chain"
                      content={chains}
                      shortcut={{ macOS: { modifiers: ["cmd", "shift"], key: "c" }, Windows: { modifiers: ["ctrl", "shift"], key: "c" } }}
                    />
                    {/* Shortcuts for sorting */}
                    <Action
                      title="Sort Previous"
                      icon={Icon.ArrowLeft}
                      shortcut={{ macOS: { modifiers: ["cmd"], key: "arrowLeft" }, Windows: { modifiers: ["ctrl"], key: "arrowLeft" } }}
                      onAction={() => cycleSort(-1)}
                    />
                    <Action
                      title="Sort Next"
                      icon={Icon.ArrowRight}
                      shortcut={{ macOS: { modifiers: ["cmd"], key: "arrowRight" }, Windows: { modifiers: ["ctrl"], key: "arrowRight" } }}
                      onAction={() => cycleSort(1)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
