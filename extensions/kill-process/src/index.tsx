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
import { useCallback, useEffect, useRef, useState } from "react";
import useInterval from "./hooks/use-interval";
import { Process } from "./types";
import { getFileIcon, getKillCommand, getPlatformSpecificErrorHelp, isWindows } from "./utils/platform";
import { fetchProcessPerformance, fetchRunningProcesses } from "./utils/process";

type SortBy = "cpu" | "memory";

const formatPercent = (value: number) => {
  // Keep the previous rounding behavior (2 decimals), but drop trailing zeros for readability.
  // Examples: 0.00 -> 0, 2.70 -> 2.7, 2.34 -> 2.34
  const trimmed = value.toFixed(2).replace(/\.?0+$/, "");
  return `${trimmed === "-0" ? "0" : trimmed}%`;
};

const isValidSortBy = (value: unknown): value is SortBy => value === "cpu" || value === "memory";

export default function ProcessList() {
  const [fetchResult, setFetchResult] = useState<Process[]>([]);
  const [state, setState] = useState<Process[]>([]);
  const [query, setQuery] = useState<string>("");

  const preferences = getPreferenceValues<Preferences>();
  const shouldIncludePaths = preferences.shouldSearchInPaths;
  const shouldIncludePid = preferences.shouldSearchInPid;
  const shouldPrioritizeAppsWhenFiltering = preferences.shouldPrioritizeAppsWhenFiltering;
  const shouldShowPID = preferences.shouldShowPID;
  const shouldShowPath = preferences.shouldShowPath;
  const skipKillConfirmation = preferences.skipKillConfirmation;
  const refreshDuration = Number(preferences.refreshDuration);
  const closeWindowAfterKill = preferences.closeWindowAfterKill;
  const clearSearchBarAfterKill = preferences.clearSearchBarAfterKill;
  const goToRootAfterKill = preferences.goToRootAfterKill;
  const initialSortBy: SortBy = isValidSortBy(preferences.sortBy) ? preferences.sortBy : "memory";
  const [sortBy, setSortBy] = useState<SortBy>(initialSortBy);
  const [aggregateApps, setAggregateApps] = useState<boolean>(preferences.aggregateApps);

  // Cache CPU data from WMI queries (persists across refreshes)
  const cpuCacheRef = useRef<Map<number, number>>(new Map());

  const fetchProcesses = useCallback(() => {
    fetchRunningProcesses()
      .then((processes) => {
        // Apply cached CPU values to new process list
        const cpuCache = cpuCacheRef.current;
        if (isWindows && cpuCache.size > 0) {
          processes = processes.map((proc) => {
            const cachedCpu = cpuCache.get(proc.id);
            return cachedCpu !== undefined ? { ...proc, cpu: cachedCpu } : proc;
          });
        }

        setFetchResult(processes);

        // On Windows, fetch accurate CPU data in the background
        if (isWindows) {
          fetchProcessPerformance().then((cpuData) => {
            if (cpuData.size > 0) {
              // Update cache with new CPU data
              cpuCacheRef.current = cpuData;
              // Update displayed processes
              setFetchResult((currentProcesses) =>
                currentProcesses.map((proc) => {
                  const cpu = cpuData.get(proc.id);
                  return cpu !== undefined ? { ...proc, cpu } : proc;
                }),
              );
            }
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
      });
  }, []);

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  useInterval(fetchProcesses, Number.isFinite(refreshDuration) ? refreshDuration : null);
  useEffect(() => {
    let processes = fetchResult;
    if (aggregateApps) {
      processes = aggregate(processes);
    }
    processes.sort((a, b) => {
      if (sortBy === "memory") {
        return a.mem > b.mem ? -1 : 1;
      } else {
        return a.cpu > b.cpu ? -1 : 1;
      }
    });
    setState(processes);
  }, [fetchResult, sortBy, aggregateApps]);

  const fileIcon = (process: Process) => {
    return getFileIcon(process);
  };

  const killProcess = async (process: Process, force: boolean = false) => {
    const processDisplayName =
      process.processName === "-" ? `PID ${process.id}` : `${process.processName} (PID: ${process.id})`;
    const alertTitle = force ? "Force Kill Process?" : "Kill Process?";
    const alertMessage = `${force ? "Force kill" : "Kill"} ${processDisplayName}?`;
    if (!skipKillConfirmation) {
      if (
        !(await confirmAlert({
          title: alertTitle,
          message: alertMessage,
        }))
      ) {
        showToast({
          title: `Cancelled killing ${processDisplayName}`,
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
        title: `Killed ${processDisplayName}`,
        style: Toast.Style.Success,
      });
    });

    setFetchResult((currentProcesses) => currentProcesses.filter((p) => p.id !== process.id));
    if (closeWindowAfterKill) {
      closeMainWindow();
    }
    if (goToRootAfterKill) {
      popToRoot({ clearSearchBar: clearSearchBarAfterKill });
    }
    if (clearSearchBarAfterKill) {
      clearSearchBar({ forceScrollToTop: true });
    }
  };

  const subtitleString = (process: Process) => {
    const subtitles = [];
    if (process.type === "aggregatedApp" && process.appName != undefined) {
      subtitles.push(process.appName);
    }
    if (shouldShowPID) {
      subtitles.push(`PID: ${process.id}`);
    }
    if (shouldShowPath) {
      subtitles.push(process.path);
    }
    return subtitles.join(" | ");
  };

  const aggregate = (processes: Process[]): Process[] => {
    const result = Array<Process>();
    type ProcessNode = {
      process: Process | undefined;
      childNodes: ProcessNode[];
    };
    const appMap = new Map<number, ProcessNode>();
    appMap.set(1, { process: { id: 1 } as Process, childNodes: [] });
    const originalAppIds = Array<number>();
    processes.forEach((process) => {
      if (process.type === "app") {
        originalAppIds.push(process.id);
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
    let afterAppIds = Array<number>();
    rootApps?.forEach((rootApp) => {
      if (rootApp.process == undefined) {
        return;
      }
      afterAppIds.push(rootApp.process.id);
      const childIds: number[] = rootApp.childNodes
        .map((node) => node.process?.id)
        .filter((item): item is number => item != undefined);
      afterAppIds = afterAppIds.concat(childIds);
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

  return (
    <List
      isLoading={state.length === 0}
      searchBarPlaceholder="Search"
      onSearchTextChange={(query) => setQuery(query)}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort"
          storeValue
          defaultValue={initialSortBy}
          // Raycast doesn't currently expose a documented "disable search field" prop.
          // `filtering={false}` is the closest available option and may hide the search field entirely.
          filtering={false}
          onChange={(newValue) => setSortBy(newValue as SortBy)}
        >
          <List.Dropdown.Section title="Sort">
            <List.Dropdown.Item title="CPU" value="cpu" />
            <List.Dropdown.Item title="Memory" value="memory" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {state
        .filter((process) => {
          if (query === "") {
            return true;
          }
          const nameMatches = process.processName.toLowerCase().includes(query.toLowerCase());
          const pathMatches =
            shouldIncludePaths &&
            process.path.toLowerCase().match(new RegExp(`.+${query}.*\\.[app|framework|prefpane]`, "ig")) != null;
          const pidMatches = shouldIncludePid && process.id.toString().includes(query);
          const appNameMatches =
            process.type === "aggregatedApp" && process.appName?.toLowerCase().includes(query.toLowerCase());

          return nameMatches || pathMatches || pidMatches || appNameMatches;
        })
        .sort((a, b) => {
          // If this flag is true, we bring apps to the top, but only if we have a query.
          if (shouldPrioritizeAppsWhenFiltering) {
            const appTypes = ["app", "aggregatedApp"];
            if (appTypes.includes(a.type) && !appTypes.includes(b.type)) {
              return -1;
            } else if (!appTypes.includes(a.type) && appTypes.includes(b.type)) {
              return 1;
            }
          }

          // Otherwise, we leave the order as is.
          return 0;
        })
        .map((process, index) => {
          const icon = fileIcon(process);
          return (
            <List.Item
              key={index}
              title={process.processName}
              subtitle={subtitleString(process)}
              icon={icon}
              accessories={[
                {
                  text: formatPercent(process.cpu),
                  icon: { source: "cpu.svg", tintColor: Color.PrimaryText },
                  tooltip: "CPU (%)",
                },
                {
                  text: prettyBytes(process.mem * 1024),
                  icon: {
                    source: "memorychip.svg",
                    tintColor: Color.PrimaryText,
                  },
                  tooltip: "Memory",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Kill" icon={Icon.XMarkCircle} onAction={() => killProcess(process)} />
                  <Action title="Force Kill" icon={Icon.XMarkCircle} onAction={() => killProcess(process, true)} />
                  {process.path == null ? null : (
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={process.path}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                  )}
                  <Action
                    title="Reload"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => fetchProcesses()}
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
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
