import {
  Action,
  ActionPanel,
  clearSearchBar,
  closeMainWindow,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { exec } from "child_process";
import prettyBytes from "pretty-bytes";
import { useEffect, useState } from "react";
import useInterval from "./hooks/use-interval";
import { Process } from "./types";
import { getFileIcon, getKillCommand, getPlatformSpecificErrorHelp, isWindows } from "./utils/platform";
import { fetchProcessPerformance, fetchRunningProcesses } from "./utils/process";

function isAppProcessType(type: Process["type"]): boolean {
  return type === "app" || type === "aggregatedApp";
}

function stripZeroDecimals(value: string): string {
  return value.endsWith(".00") ? value.slice(0, -3) : value;
}

function stripTrailingZeros(value: string): string {
  // Examples: "6.80" -> "6.8", "6.00" -> "6", "6.01" -> "6.01"
  return value.replace(/(?:\.0+|(\.\d*[1-9])0+)$/, "$1");
}

function formatCpu(cpu: number): string {
  // Avoid noise like "0.00%". Keep other values at 2 decimals unless they're exactly ".00".
  if (Math.abs(cpu) < 0.005) return "0%";
  return `${stripTrailingZeros(cpu.toFixed(2))}%`;
}

function formatMemory(memKb: number): string {
  const mb = memKb / 1024;
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${stripZeroDecimals(gb.toFixed(2))} GB`;
  }
  // If it's shown in MB, keep it as a whole number to reduce visual jitter.
  return `${Math.floor(mb)} MB`;
}

export default function ProcessList() {
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchResult, setFetchResult] = useState<Process[]>([]);
  const [state, setState] = useState<Process[]>([]);
  const [query, setQuery] = useState<string>("");

  const preferences = getPreferenceValues<Preferences>();
  const shouldIncludePaths = preferences.shouldSearchInPaths;
  const shouldIncludePid = preferences.shouldSearchInPid;
  const shouldPrioritizeAppsWhenFiltering = preferences.shouldPrioritizeAppsWhenFiltering;
  const shouldShowPID = preferences.shouldShowPID;
  const shouldShowPath = preferences.shouldShowPath;
  const refreshDuration = +preferences.refreshDuration;
  const closeWindowAfterKill = preferences.closeWindowAfterKill;
  const clearSearchBarAfterKill = preferences.clearSearchBarAfterKill;
  const goToRootAfterKill = preferences.goToRootAfterKill;
  const skipConfirmation = preferences.skipConfirmation;
  const [sortBy, setSortBy] = useState<"cpu" | "memory">(preferences.defaultSort === "memory" ? "memory" : "cpu");
  const [aggregateApps, setAggregateApps] = useState<boolean>(preferences.aggregateApps);

  // Cache CPU data from WMI queries (persists across refreshes)
  const [cpuCache, setCpuCache] = useState<Map<number, number>>(new Map());

  const fetchProcesses = (showLoading: boolean) => {
    if (showLoading) {
      setIsLoading(true);
    }
    fetchRunningProcesses()
      .then((processes) => {
        // Apply cached CPU values to new process list
        if (isWindows && cpuCache.size > 0) {
          processes = processes.map((proc) => {
            const cachedCpu = cpuCache.get(proc.id);
            return cachedCpu !== undefined ? { ...proc, cpu: cachedCpu } : proc;
          });
        }

        setFetchResult(processes);

        // On Windows, fetch accurate CPU data in the background
        if (isWindows) {
          fetchProcessPerformance()
            .then((cpuData) => {
              if (cpuData.size > 0) {
                // Update cache with new CPU data
                setCpuCache(cpuData);
                // Update displayed processes
                setFetchResult((currentProcesses) =>
                  currentProcesses.map((proc) => {
                    const cpu = cpuData.get(proc.id);
                    return cpu !== undefined ? { ...proc, cpu } : proc;
                  }),
                );
              }
            })
            .catch((err) => {
              console.error("Failed to fetch process performance:", err);
            });
        }
      })
      .catch((err) => {
        console.error("Failed to fetch processes:", err);
        showToast({
          title: "Failed to fetch processes",
          style: Toast.Style.Failure,
          message: err instanceof Error ? err.message : "Unknown error",
        });
      })
      .finally(() => {
        setHasLoadedOnce(true);
        setIsLoading(false);
      });
  };

  useInterval(() => fetchProcesses(!hasLoadedOnce), refreshDuration);
  useEffect(() => {
    let processes = [...fetchResult];
    if (aggregateApps) {
      processes = aggregate(processes);
    }

    processes.sort((a, b) => {
      if (shouldPrioritizeAppsWhenFiltering && query.trim() !== "") {
        const rankA = isAppProcessType(a.type) ? 0 : 1;
        const rankB = isAppProcessType(b.type) ? 0 : 1;
        const rankDiff = rankA - rankB;
        if (rankDiff !== 0) return rankDiff;
      }

      const aValue = sortBy === "memory" ? a.mem : a.cpu;
      const bValue = sortBy === "memory" ? b.mem : b.cpu;
      if (aValue === bValue) return 0;
      return aValue > bValue ? -1 : 1;
    });
    setState(processes);
  }, [fetchResult, sortBy, aggregateApps, shouldPrioritizeAppsWhenFiltering, query]);

  const fileIcon = (process: Process) => {
    return getFileIcon(process);
  };

  const getKeywords = (process: Process): string[] => {
    const keywords: string[] = [process.processName];
    if (process.appName) keywords.push(process.appName);
    if (shouldIncludePid) keywords.push(String(process.id));
    if (shouldIncludePaths && process.path) {
      keywords.push(process.path);

      // Add path segments so queries like "Applications" or "Chrome.app" match reliably.
      const parts = process.path.split("/").filter(Boolean);
      for (const part of parts.slice(0, 12)) {
        keywords.push(part);
      }
    }
    return keywords;
  };

  const killProcess = async (process: Process, force: boolean = false) => {
    const processName = process.processName === "-" ? `process ${process.id}?` : process.processName;
    if (!skipConfirmation) {
      const didConfirm = await confirmAlert({
        title: `${force ? "Force " : ""}Kill ${processName}?`,
      });
      if (!didConfirm) {
        showToast({
          title: `Cancelled Killing ${processName}`,
          style: Toast.Style.Failure,
        });
        return;
      }
    }

    const command = getKillCommand(process.id, force);
    exec(command, (error) => {
      if (error) {
        const errorHelp = getPlatformSpecificErrorHelp(force);

        if (force && errorHelp.helpUrl) {
          confirmAlert({
            title: errorHelp.title,
            message: errorHelp.message,
            primaryAction: {
              title: "Open Help",
              onAction: () => open(errorHelp.helpUrl!),
            },
          });
        } else {
          showToast({
            title: errorHelp.title,
            message: errorHelp.message,
            style: Toast.Style.Failure,
          });
        }
        return;
      }

      showToast({
        title: `Killed ${processName}`,
        style: Toast.Style.Success,
      });

      setFetchResult((current) => current.filter((p) => p.id !== process.id));
      if (closeWindowAfterKill) {
        closeMainWindow();
      }
      if (goToRootAfterKill) {
        popToRoot({ clearSearchBar: clearSearchBarAfterKill });
      }
      if (clearSearchBarAfterKill) {
        clearSearchBar({ forceScrollToTop: true });
      }
    });
  };

  const subtitleString = (process: Process): string | undefined => {
    const subtitles: string[] = [];

    // Avoid rendering a redundant subtitle like "Chrome  Chrome".
    if (process.type === "aggregatedApp" && process.appName) {
      const appName = process.appName.trim();
      const processName = process.processName.trim();
      if (appName !== "" && appName.toLowerCase() !== processName.toLowerCase()) {
        subtitles.push(appName);
      }
    }

    if (shouldShowPID) subtitles.push(process.id.toString());
    if (shouldShowPath) subtitles.push(process.path);

    return subtitles.length > 0 ? subtitles.join(" - ") : undefined;
  };

  const aggregate = (processes: Process[]): Process[] => {
    const result = Array<Process>();
    type ProcessNode = {
      process: Process | undefined;
      childNodes: ProcessNode[];
    };
    const appMap = new Map<number, ProcessNode>();
    appMap.set(1, { process: { id: 1 } as Process, childNodes: [] });
    processes.forEach((process) => {
      if (process.type === "app") {
        let node = appMap.get(process.id);
        if (node == undefined) {
          node = { process, childNodes: [] } as ProcessNode;
          appMap.set(process.id, node);
        } else {
          node.process = process;
        }
        let knownRootNode = appMap.get(process.pid);
        if (knownRootNode == undefined) {
          knownRootNode = {
            process: undefined,
            childNodes: [node],
          } as ProcessNode;
          appMap.set(process.pid, knownRootNode);
        } else {
          if (knownRootNode.process == undefined) {
            knownRootNode.childNodes.push(node);
          } else {
            let nextNode;
            while (
              knownRootNode?.process != undefined &&
              knownRootNode.process.pid !== 1 &&
              (nextNode = appMap.get(knownRootNode.process.pid)) != undefined
            ) {
              knownRootNode = nextNode;
            }
            knownRootNode?.childNodes.push(node);
          }
        }
        // move childNodes to parent
        if (knownRootNode.process?.id !== 1) {
          knownRootNode.childNodes = knownRootNode.childNodes.concat(node.childNodes);
          node.childNodes = [];
        }
      } else {
        result.push(process);
      }
    });
    const rootApps = appMap.get(1)?.childNodes;
    rootApps?.forEach((rootApp) => {
      if (rootApp.process == undefined) {
        return;
      }
      result.push({
        id: rootApp.process.id,
        pid: rootApp.process.pid,
        cpu:
          (rootApp.childNodes?.reduce((acc, cur) => {
            return acc + (cur.process?.cpu ?? 0);
          }, 0) ?? 0) + rootApp.process.cpu,
        mem:
          (rootApp.childNodes?.reduce((acc, cur) => {
            return acc + (cur.process?.mem ?? 0);
          }, 0) ?? 0) + rootApp.process.mem,
        type: "aggregatedApp",
        path: rootApp.process.path,
        processName: rootApp.process.processName,
        appName: rootApp.process.path.match(/(?<=\/)[^/]+(?=\.app\/)/)?.[0],
      } as Process);
    });
    return result;
  };

  const processCount = state.length;

  return (
    <List
      filtering
      isLoading={isLoading}
      searchBarPlaceholder="Search processes"
      onSearchTextChange={(newQuery) => setQuery(newQuery)}
      searchBarAccessory={
        <List.Dropdown tooltip="Sort" value={sortBy} onChange={(newValue) => setSortBy(newValue as "cpu" | "memory")}>
          <List.Dropdown.Section title="Sort By">
            <List.Dropdown.Item title="CPU Usage" value="cpu" />
            <List.Dropdown.Item title="Memory Usage" value="memory" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading ? (
        <List.EmptyView
          icon={query.trim() !== "" ? Icon.MagnifyingGlass : Icon.Terminal}
          title={query.trim() !== "" ? `No matches for "${query}"` : "No processes to show"}
          description={
            query.trim() !== ""
              ? "Try adjusting Advanced Filtering preferences (PID/Path) or refine your query."
              : "Try reloading the list."
          }
        />
      ) : null}
      <List.Section title="Processes" subtitle={`${processCount} running`}>
        {state.map((process) => {
          const icon = fileIcon(process);
          const hasPath = Boolean(process.path);

          return (
            <List.Item
              key={process.id}
              title={process.processName}
              subtitle={subtitleString(process)}
              icon={icon}
              keywords={getKeywords(process)}
              accessories={[
                {
                  text: formatCpu(process.cpu),
                  icon: { source: "cpu.svg", tintColor: Color.PrimaryText },
                  tooltip: "% CPU",
                },
                {
                  text: formatMemory(process.mem),
                  icon: {
                    source: "memorychip.svg",
                    tintColor: Color.PrimaryText,
                  },
                  tooltip: `Memory (${prettyBytes(process.mem * 1024)})`,
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Kill" icon={Icon.XMarkCircle} onAction={() => killProcess(process)} />
                    <Action title="Force Kill" icon={Icon.XMarkCircle} onAction={() => killProcess(process, true)} />
                    {hasPath ? (
                      <Action.CopyToClipboard
                        title="Copy Path"
                        content={process.path}
                        shortcut={Keyboard.Shortcut.Common.CopyPath}
                      />
                    ) : null}
                    <Action
                      title="Reload"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={() => fetchProcesses(true)}
                    />
                    <Action
                      title={`${aggregateApps ? "Disable" : "Enable"} Aggregating Apps`}
                      icon={Icon.AppWindow}
                      shortcut={{ modifiers: ["shift"], key: "tab" }}
                      onAction={() => {
                        setAggregateApps(!aggregateApps);
                        showToast({
                          title: `${aggregateApps ? "Disabled" : "Enabled"} aggregating apps`,
                        });
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
