import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import MCPServerDetail from "./components/MCPServerDetail";
import {
  formatRAMUsage,
  getCPUColor,
  getMCPConfigs,
  getMCPProcesses,
  getRAMColor,
  getSourceColor,
  getSourceDisplayName,
  killProcess,
  MCPConfig,
  MCPProcess,
} from "./utils/mcp-detector";

// Auto-refresh interval in milliseconds
const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [processes, setProcesses] = useState<MCPProcess[]>([]);
  const [configs, setConfigs] = useState<MCPConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async (showErrorToast = true, isInitialLoad = false) => {
    if (isInitialLoad) {
      setIsLoading(true);
    }
    try {
      const mcpProcesses = getMCPProcesses();
      const mcpConfigs = getMCPConfigs();
      setProcesses(mcpProcesses);
      setConfigs(mcpConfigs);
    } catch (error) {
      console.error("Error loading MCP data:", error);
      if (showErrorToast) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load MCP servers",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Initial load
    loadData(true, true);

    // Set up auto-refresh interval
    const intervalId = setInterval(() => {
      loadData(false, false); // Don't show error toast or loading state on auto-refresh
    }, AUTO_REFRESH_INTERVAL);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [loadData]);

  const revalidate = useCallback(() => {
    loadData(true); // Show error toast on manual refresh
  }, [loadData]);

  // Filter processes based on search and source filter
  const filteredProcesses = processes.filter((process) => {
    const matchesSearch =
      searchText === "" ||
      process.name.toLowerCase().includes(searchText.toLowerCase()) ||
      process.fullCommand.toLowerCase().includes(searchText.toLowerCase());

    const matchesSource = selectedSource === "all" || process.source === selectedSource;

    return matchesSearch && matchesSource;
  });

  // Get unique sources for filtering
  const sources = [...new Set(processes.map((p) => p.source))];

  // Calculate total RAM usage
  const totalRAM = processes.reduce((sum, p) => sum + p.ramUsageMB, 0);

  async function handleKillProcess(process: MCPProcess, force = false) {
    const options: Alert.Options = {
      title: force ? "Force Kill MCP Server?" : "Kill MCP Server?",
      message: `Are you sure you want to ${force ? "force " : ""}kill "${process.name}" (PID: ${process.pid})?${force ? " This will immediately terminate the process." : ""}`,
      primaryAction: {
        title: force ? "Force Kill" : "Kill",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      const success = killProcess(process.pid, force);
      if (success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Process Killed",
          message: `${process.name} (PID: ${process.pid}) has been terminated`,
        });
        revalidate();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Kill Process",
          message: force ? "Unable to force kill the process" : "Try force killing the process",
        });
      }
    }
  }

  async function handleKillAll() {
    const options: Alert.Options = {
      title: "Kill All MCP Servers?",
      message: `This will terminate ${filteredProcesses.length} MCP server${filteredProcesses.length !== 1 ? "s" : ""}. Are you sure?`,
      primaryAction: {
        title: "Kill All",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      let killed = 0;
      let failed = 0;

      for (const process of filteredProcesses) {
        if (killProcess(process.pid, false)) {
          killed++;
        } else {
          failed++;
        }
      }

      await showToast({
        style: failed === 0 ? Toast.Style.Success : Toast.Style.Failure,
        title: failed === 0 ? "All Processes Killed" : "Some Processes Failed",
        message: `Killed: ${killed}, Failed: ${failed}`,
      });

      revalidate();
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search MCP servers..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Source" value={selectedSource} onChange={setSelectedSource}>
          <List.Dropdown.Item title="All Sources" value="all" />
          <List.Dropdown.Section title="Sources">
            {sources.map((source) => (
              <List.Dropdown.Item key={source} title={getSourceDisplayName(source)} value={source} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredProcesses.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No MCP Servers Running"
          description={
            configs.length > 0
              ? `Found ${configs.length} MCP configuration${configs.length !== 1 ? "s" : ""}, but no servers are currently running.`
              : "No MCP configurations found. Configure MCP servers in Claude Desktop, VS Code, or Cursor."
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title="Running MCP Servers"
          subtitle={`${filteredProcesses.length} server${filteredProcesses.length !== 1 ? "s" : ""} • Total RAM: ${formatRAMUsage(totalRAM)}`}
        >
          {filteredProcesses.map((process) => (
            <List.Item
              key={process.pid}
              title={process.name}
              subtitle={`PID: ${process.pid}`}
              icon={{
                source: Icon.Terminal,
                tintColor: getSourceColor(process.source),
              }}
              accessories={[
                {
                  tag: {
                    value: formatRAMUsage(process.ramUsageMB),
                    color: getRAMColor(process.ramUsageMB),
                  },
                  tooltip: `RAM: ${formatRAMUsage(process.ramUsageMB)} (${process.ramPercentage.toFixed(1)}%)`,
                },
                {
                  tag: {
                    value: `${process.cpuPercentage.toFixed(1)}%`,
                    color: getCPUColor(process.cpuPercentage),
                  },
                  tooltip: `CPU: ${process.cpuPercentage.toFixed(1)}%`,
                },
                {
                  tag: {
                    value: getSourceDisplayName(process.source),
                    color: getSourceColor(process.source),
                  },
                },
                {
                  text: process.startTime,
                  tooltip: `Started: ${process.startTime}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="View">
                    <Action.Push
                      title="View Details"
                      icon={Icon.Eye}
                      target={<MCPServerDetail process={process} onKill={revalidate} />}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Actions">
                    <Action
                      title="Kill Process"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      onAction={() => handleKillProcess(process, false)}
                      shortcut={{ modifiers: ["cmd"], key: "k" }}
                    />
                    <Action
                      title="Force Kill Process"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleKillProcess(process, true)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                    />
                    {filteredProcesses.length > 1 && (
                      <Action
                        title="Kill All Servers"
                        icon={Icon.XMarkCircleFilled}
                        style={Action.Style.Destructive}
                        onAction={handleKillAll}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Other">
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={revalidate}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Process ID"
                      content={process.pid.toString()}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Command"
                      content={process.fullCommand}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
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
