import {
  Action,
  ActionPanel,
  clearSearchBar,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { exec } from "child_process";
import { useState, useEffect } from "react";
import prettyBytes from "pretty-bytes";
import useInterval from "./hooks/use-interval";

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
  const [sortByMem, setSortByMem] = useState<boolean>(preferences.sortByMem);
  const [aggregateApps, setAggregateApps] = useState<boolean>(preferences.aggregateApps);

  const fetchProcesses = () => {
    exec(`ps -eo pid,ppid,pcpu,rss,comm`, (err, stdout) => {
      if (err != null) {
        return;
      }

      const processes = stdout
        .split("\n")
        .map((line) => {
          const defaultValue = ["", "", "", "", "", ""];
          const regex = /(\d+)\s+(\d+)\s+(\d+[.|,]\d+)\s+(\d+)\s+(.*)/;
          const [, id, pid, cpu, mem, path] = line.match(regex) ?? defaultValue;
          const processName = path.match(/[^/]*[^/]*$/i)?.[0] ?? "";
          const isPrefPane = path.includes(".prefPane");
          const isApp = path.includes(".app/");

          return {
            id: parseInt(id),
            pid: parseInt(pid),
            cpu: parseFloat(cpu),
            mem: parseInt(mem),
            type: isPrefPane ? "prefPane" : isApp ? "app" : "binary",
            path,
            processName,
          } as Process;
        })
        .filter((process) => process.processName !== "");

      setFetchResult(processes);
    });
  };

  useInterval(fetchProcesses, refreshDuration);
  useEffect(() => {
    let processes = fetchResult;
    if (aggregateApps) {
      processes = aggregate(processes);
    }
    processes.sort((a, b) => {
      if (sortByMem) {
        return a.mem > b.mem ? -1 : 1;
      } else {
        return a.cpu > b.cpu ? -1 : 1;
      }
    });
    setState(processes);
  }, [fetchResult, sortByMem, aggregateApps]);

  const fileIcon = (process: Process) => {
    if (process.type === "prefPane") {
      return { fileIcon: process.path?.replace(/(.+\.prefPane)(.+)/, "$1") ?? "" };
    }

    if (process.type === "app" || process.type === "aggregatedApp") {
      return { fileIcon: process.path?.replace(/(.+\.app)(.+)/, "$1") ?? "" };
    }

    return "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/ExecutableBinaryIcon.icns";
  };

  const killProcess = (process: Process) => {
    exec(`kill -9 ${process.id}`);
    setFetchResult(state.filter((p) => p.id !== process.id));
    if (closeWindowAfterKill) {
      closeMainWindow();
    }
    if (clearSearchBarAfterKill) {
      clearSearchBar({ forceScrollToTop: true });
    }
    showToast({
      title: `✅ Killed ${process.processName === "-" ? `process ${process.id}` : process.processName}`,
      style: Toast.Style.Success,
    });
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
          knownRootNode = { process: undefined, childNodes: [node] } as ProcessNode;
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
      searchBarPlaceholder="Filter by name..."
      onSearchTextChange={(query) => setQuery(query)}
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
                  text: sortByMem
                    ? `${process.cpu.toFixed(2)}% ${prettyBytes(process.mem * 1024)}`
                    : `${prettyBytes(process.mem * 1024)} ${process.cpu.toFixed(2)}%`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Kill" icon={Icon.XMarkCircle} onAction={() => killProcess(process)} />
                  {process.path == null ? null : <Action.CopyToClipboard title="Copy Path" content={process.path} />}
                  <Action
                    title="Reload"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ key: "r", modifiers: ["cmd"] }}
                    onAction={() => fetchProcesses()}
                  />
                  <Action
                    title={`Sort by ${sortByMem ? "CPU" : "memory"} usage`}
                    icon={Icon.Filter}
                    shortcut={{ key: "tab", modifiers: [] }}
                    onAction={() => {
                      setSortByMem(!sortByMem);
                      showToast({
                        title: `Sorted by ${sortByMem ? "CPU" : "memory"} usage`,
                      });
                    }}
                  />
                  <Action
                    title={`${aggregateApps ? "Dis" : "En"}able aggregating apps`}
                    icon={Icon.AppWindow}
                    shortcut={{ key: "tab", modifiers: ["shift"] }}
                    onAction={() => {
                      setAggregateApps(!aggregateApps);
                      showToast({
                        title: `${aggregateApps ? "Dis" : "En"}abled aggregating apps`,
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

type Process = {
  id: number;
  pid: number;
  cpu: number;
  mem: number;
  type: "prefPane" | "app" | "binary" | "aggregatedApp";
  path: string;
  processName: string;
  appName: string | undefined;
};
