import { Action, ActionPanel, List, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchPorts, clearProcessCache } from "../lib/fetchPorts";
import { killProcess } from "../lib/killProcess";

// Simple debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

interface PortInfo {
  localAddress: string;
  pid: string;
  processName?: string;
}

export default function Command() {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Debounced search to avoid excessive filtering
  const debouncedSearchText = useDebounce(searchText, 300);

  // Load ports on component mount
  useEffect(() => {
    fetchPorts(setPorts, setLoading);
    setLastRefresh(Date.now());
  }, []);

  // Smart auto-refresh every 30 seconds
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      const timeSinceRefresh = Date.now() - lastRefresh;
      if (timeSinceRefresh >= 30000) {
        // 30 seconds
        fetchPorts(setPorts, setLoading);
        setLastRefresh(Date.now());
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [loading, lastRefresh]);

  // Handle killing a process with optimistic updates
  const handleKillProcess = useCallback(
    (pid: string, localAddress: string) => {
      // Optimistically remove from UI
      setPorts(ports.filter((p) => p.pid !== pid));

      killProcess(pid, () => {
        // Refresh the list after killing the process
        setLoading(true);
        fetchPorts(setPorts, setLoading);
        setLastRefresh(Date.now());
        showToast({
          style: Toast.Style.Success,
          title: "Process killed",
          message: `Process on port ${localAddress} terminated`,
        });
      });
    },
    [ports],
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    clearProcessCache();
    setLoading(true);
    fetchPorts(setPorts, setLoading);
    setLastRefresh(Date.now());
    showToast({
      style: Toast.Style.Success,
      title: "Refreshed",
      message: "Port list updated",
    });
  }, []);

  // Memoized filtering for better performance
  const filteredPorts = useMemo(() => {
    if (!debouncedSearchText.trim()) return ports;

    const searchLower = debouncedSearchText.toLowerCase();
    return ports.filter((port) => {
      return (
        port.localAddress.toLowerCase().includes(searchLower) ||
        port.pid.includes(searchLower) ||
        port.processName?.toLowerCase().includes(searchLower)
      );
    });
  }, [ports, debouncedSearchText]);

  // Memoized list items to prevent unnecessary re-renders
  const listItems = useMemo(() => {
    return filteredPorts.map((port) => {
      const portNumber = port.localAddress.split(":").pop() || "";
      const isSystemPort = parseInt(portNumber) < 1024;

      return (
        <List.Item
          key={`${port.pid}-${port.localAddress}`}
          title={port.localAddress}
          subtitle={`PID: ${port.pid}`}
          accessories={[
            {
              text: port.processName || "Unknown Process",
              icon: port.processName ? Icon.Terminal : Icon.QuestionMark,
              tooltip: port.processName || "Process name not available",
            },
            ...(isSystemPort
              ? [
                  {
                    icon: Icon.Shield,
                    tooltip: "System/Reserved Port",
                  },
                ]
              : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Kill Process"
                onAction={() => handleKillProcess(port.pid, port.localAddress)}
                icon={Icon.Trash}
                shortcut={{ modifiers: ["ctrl", "shift"], key: "k" }}
              />
              <Action
                title="Refresh List"
                onAction={handleRefresh}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["ctrl"], key: "r" }}
              />
              <Action.CopyToClipboard
                content={port.localAddress}
                title="Copy Port Address"
                shortcut={{ modifiers: ["ctrl"], key: "c" }}
              />
              <Action.CopyToClipboard
                content={port.pid}
                title="Copy Pid"
                shortcut={{ modifiers: ["ctrl", "shift"], key: "p" }}
              />
              <Action.CopyToClipboard
                content={port.processName || ""}
                title="Copy Process Name"
                shortcut={{ modifiers: ["ctrl", "shift"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      );
    });
  }, [filteredPorts, handleKillProcess, handleRefresh]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search ports, PID, or process name..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      throttle={true}
    >
      {filteredPorts.length === 0 && !loading ? (
        <List.EmptyView
          icon={debouncedSearchText ? Icon.MagnifyingGlass : Icon.Network}
          title={debouncedSearchText ? "No matching ports found" : "No ports found"}
          description={
            debouncedSearchText
              ? `No ports match "${debouncedSearchText}"`
              : "No listening TCP ports detected on your system"
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={handleRefresh} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`${filteredPorts.length} Active Ports`}>{listItems}</List.Section>
      )}
    </List>
  );
}
