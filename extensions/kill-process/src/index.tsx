import {
  Action,
  ActionPanel,
  clearSearchBar,
  closeMainWindow,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
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
import { getFileIcon, getKillCommand, getPlatformSpecificErrorHelp } from "./utils/platform";
import { fetchRunningProcesses } from "./utils/process";

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
  const refreshDuration = +preferences.refreshDuration;
  const closeWindowAfterKill = preferences.closeWindowAfterKill;
  const clearSearchBarAfterKill = preferences.clearSearchBarAfterKill;
  const goToRootAfterKill = preferences.goToRootAfterKill;
  const [sortBy, setSortBy] = useState<"cpu" | "memory">(preferences.sortByMem ? "memory" : "cpu");
  const [aggregateApps, setAggregateApps] = useState<boolean>(preferences.aggregateApps);

  const fetchProcesses = () => {
    fetchRunningProcesses()
      .then((processes) => {
        setFetchResult(processes);
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
    const processName = process.processName === "-" ? `process ${process.id}?` : process.processName;
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

  const subtitleString = (process: Process) => {
    const subtitles = [];
    if (process.type === "aggregatedApp" && process.appName != undefined) {
      subtitles.push(process.appName);
    }
    if (shouldShowPID) {
      subtitles.push(process.id.toString());
    }
    if (shouldShowPath) {
      subtitles.push(process.path);
    }
    return subtitles.join(" - ");
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

  const processCount = state.length;

  return (
    <List
      isLoading={state.length === 0}
      searchBarPlaceholder="Filter by name"
      onSearchTextChange={(query) => setQuery(query)}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" storeValue onChange={(newValue) => setSortBy(newValue as "cpu" | "memory")}>
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
                    {process.path == null ? null : <Action.CopyToClipboard title="Copy Path" content={process.path} />}
                    <Action
                      title="Reload"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ key: "r", modifiers: ["cmd"] }}
                      onAction={() => fetchProcesses()}
                    />
                    <Action
                      title={`${aggregateApps ? "Disable" : "Enable"} Aggregating Apps`}
                      icon={Icon.AppWindow}
                      shortcut={{ key: "tab", modifiers: ["shift"] }}
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
      </List.Section>
    </List>
  );
}
