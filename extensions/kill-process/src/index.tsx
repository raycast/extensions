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
  LocalStorage,
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

type SortBy = "cpu" | "memory";

const APP_GROUPING_STORAGE_KEY = "kill-process.app-grouping-enabled";

const parseBooleanLike = (value: LocalStorage.Value | undefined): boolean | null => {
  if (value == null) {
    return null;
  }
  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }
  if (value === false || value === "false" || value === 0 || value === "0") {
    return false;
  }
  return null;
};

const parseSortByPreference = (value: unknown): SortBy => {
  // Backwards compatible:
  // - old preference: boolean (true => memory, false => cpu)
  // - new preference: dropdown string ("cpu" | "memory")
  if (value === true || value === "memory") {
    return "memory";
  }
  if (value === false || value === "cpu") {
    return "cpu";
  }
  return "cpu";
};

export default function ProcessList() {
  const [fetchResult, setFetchResult] = useState<Process[]>([]);
  const [state, setState] = useState<Process[]>([]);
  const [query, setQuery] = useState<string>("");

  const preferences = getPreferenceValues<Preferences>();
  const shouldSearchInPaths = preferences.shouldSearchInPaths;
  const shouldSearchInPid = preferences.shouldSearchInPid;
  const shouldPrioritizeAppsWhenFiltering = preferences.shouldPrioritizeAppsWhenFiltering;
  const shouldShowPID = preferences.shouldShowPID;
  const shouldShowPath = preferences.shouldShowPath;
  const refreshDuration = +preferences.refreshDuration;
  const closeWindowAfterKill = preferences.closeWindowAfterKill;
  const clearSearchBarAfterKill = preferences.clearSearchBarAfterKill;
  const goToRootAfterKill = preferences.goToRootAfterKill;
  const skipConfirmation = preferences.skipConfirmation;
  const [sortBy, setSortBy] = useState<SortBy>(parseSortByPreference(preferences.sortByMem));
  const [isAppGroupingEnabled, setIsAppGroupingEnabled] = useState<boolean>(false);

  // Cache CPU data from WMI queries (persists across refreshes)
  const [cpuCache, setCpuCache] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    const loadAppGrouping = async () => {
      const stored = await LocalStorage.getItem<LocalStorage.Value>(APP_GROUPING_STORAGE_KEY);
      if (typeof stored === "boolean") {
        setIsAppGroupingEnabled(stored);
        return;
      }

      const parsed = parseBooleanLike(stored);
      if (parsed == null) {
        return;
      }

      setIsAppGroupingEnabled(parsed);
      await LocalStorage.setItem(APP_GROUPING_STORAGE_KEY, parsed);
    };

    void loadAppGrouping();
  }, []);

  const fetchProcesses = () => {
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
          fetchProcessPerformance().then((cpuData) => {
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
  };

  useInterval(fetchProcesses, refreshDuration);
  useEffect(() => {
    let processes = fetchResult;
    if (isAppGroupingEnabled) {
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
  }, [fetchResult, sortBy, isAppGroupingEnabled]);

  const fileIcon = (process: Process) => {
    return getFileIcon(process);
  };

  const killProcess = async (process: Process, force: boolean = false) => {
    const processName = process.processName === "-" ? `process ${process.id}?` : process.processName;
    if (!skipConfirmation) {
      if (
        !(await confirmAlert({
          title: `${force ? "Force " : ""}Kill ${processName}?`,
          rememberUserChoice: true,
        }))
      ) {
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
    });

    setFetchResult(state.filter((p) => p.id !== process.id));
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

  const subtitleString = (process: Process): string | undefined => {
    const subtitles: string[] = [];
    const title = process.processName?.trim() ?? "";
    const titleLower = title.toLowerCase();

    const pushSubtitle = (value: string | undefined | null) => {
      const trimmed = value?.trim();
      if (!trimmed) {
        return;
      }

      // If the subtitle would duplicate the row title, omit it entirely.
      if (trimmed.toLowerCase() === titleLower) {
        return;
      }

      // Prevent duplicates within the subtitle itself.
      if (subtitles.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
        return;
      }

      subtitles.push(trimmed);
    };

    if (process.type === "aggregatedApp") {
      pushSubtitle(process.appName);
    }
    if (shouldShowPID) {
      pushSubtitle(process.id.toString());
    }
    if (shouldShowPath) {
      pushSubtitle(process.path);
    }

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

  const toggleAppGrouping = async () => {
    const nextValue = !isAppGroupingEnabled;
    await LocalStorage.setItem(APP_GROUPING_STORAGE_KEY, nextValue);
    setIsAppGroupingEnabled(nextValue);
    await showToast({ title: `${nextValue ? "Enabled" : "Disabled"} App Grouping` });
  };

  const processCount = state.length;

  return (
    <List
      isLoading={state.length === 0}
      searchBarPlaceholder="Filter by name"
      onSearchTextChange={(query) => setQuery(query)}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          storeValue
          defaultValue={sortBy}
          onChange={(newValue) => setSortBy(newValue as SortBy)}
        >
          <List.Dropdown.Section title="Sort By">
            <List.Dropdown.Item title="CPU Usage" value="cpu" />
            <List.Dropdown.Item title="Memory Usage" value="memory" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title="Processes" subtitle={`${processCount} running`}>
        {state
          .filter((process) => {
            if (query === "") {
              return true;
            }
            const nameMatches = process.processName.toLowerCase().includes(query.toLowerCase());
            const pathMatches =
              shouldSearchInPaths &&
              process.path.toLowerCase().match(new RegExp(`.+${query}.*\\.[app|framework|prefpane]`, "ig")) != null;
            const pidMatches = shouldSearchInPid && process.id.toString().includes(query);
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
                    text: `${process.cpu.toFixed(2)}%`,
                    icon: { source: "cpu.svg", tintColor: Color.PrimaryText },
                    tooltip: "% CPU",
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
                      title={`${isAppGroupingEnabled ? "Disable" : "Enable"} App Grouping`}
                      icon={Icon.AppWindow}
                      shortcut={{ modifiers: ["shift"], key: "tab" }}
                      onAction={toggleAppGrouping}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}
