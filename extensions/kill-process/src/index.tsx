import { ActionPanel, Action, clearSearchBar, Icon, List, preferences, showHUD, showToast } from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";
import prettyBytes from "pretty-bytes";

export default function ProcessList() {
  const [state, setState] = useState<Process[]>([]);
  const [query, setQuery] = useState<string | undefined>(undefined);
  const shouldIncludePaths = (preferences.shouldSearchInPaths?.value as boolean) ?? false;
  const shouldIncludePid = (preferences.shouldSearchInPid?.value as boolean) ?? false;
  const shouldPrioritizeAppsWhenFiltering = (preferences.shouldPrioritizeAppsWhenFiltering?.value as boolean) ?? false;
  const shouldShowPID = (preferences.shouldShowPID?.value as boolean) ?? false;
  const shouldShowPath = (preferences.shouldShowPath?.value as boolean) ?? false;
  const [sortByMem, setSortByMem] = useState<boolean>((preferences.sortByMem?.value as boolean) ?? false);
  const [aggregateApps, setAggregateApps] = useState<boolean>((preferences.aggregateApps?.value as boolean) ?? false);

  const fetchProcesses = () => {
    exec(`ps -eo pid,pcpu,rss,comm`, (err, stdout) => {
      if (err != null) {
        return;
      }

      let processes = stdout
        .split("\n")
        .map((line) => {
          const [, id, cpu, mem, path] = line.match(/(\d+)\s+(\d+[.|,]\d+)\s+(\d+)\s+(.*)/) ?? ["", "", "", "", ""];
          const processName = path.match(/[^/]*[^/]*$/i)?.[0] ?? "";
          const isPrefPane = path.includes(".prefPane");
          const isApp = path.includes(".app/");
          const appName = path.match(/(?<=\/)[^/]+(?=\.app\/)/)?.[0] ?? "";

          return {
            id: parseInt(id),
            cpu: parseFloat(cpu),
            mem: parseInt(mem),
            type: isPrefPane ? "prefPane" : isApp ? "app" : "binary",
            path,
            processName,
            appName: isApp ? appName : undefined,
          } as Process;
        })
        .filter((process) => process.processName !== "");

      if (aggregateApps) {
        processes = (() => {
          const map = new Map<string, Process>();
          processes.forEach((process) => {
            if (process.type == "app" && process.appName != undefined) {
              const originalProcess = map.get(process.appName);
              if (originalProcess != undefined) {
                map.set(process.appName, {
                  id: undefined,
                  cpu: originalProcess.cpu + process.cpu,
                  mem: originalProcess.mem + process.mem,
                  type: "aggregatedApp",
                  path: originalProcess.path,
                  processName: undefined,
                  appName: process.appName,
                } as Process);
              } else {
                map.set(process.appName, {
                  id: undefined,
                  cpu: process.cpu,
                  mem: process.mem,
                  type: "aggregatedApp",
                  path: process.path?.match(/.*\.app/)?.[0] ?? undefined,
                  processName: undefined,
                  appName: process.appName,
                } as Process);
              }
            } else if (process.processName != undefined) {
              map.set(process.processName, process);
            }
          });
          return Array.from(map.values());
        })();
      }

      processes.sort((a, b) => {
        if (sortByMem) {
          return a.mem > b.mem ? -1 : 1;
        } else {
          return a.cpu > b.cpu ? -1 : 1;
        }
      });

      setState(processes);
    });
  };

  useEffect(() => {
    fetchProcesses();
  }, [sortByMem, aggregateApps]);

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
    let message: string;
    if (process.type == "aggregatedApp") {
      exec(`killall "${process.appName}"`);
      setState(state.filter((p) => p.appName != process.appName));
      message = `✅ Killed App ${process.appName}`;
    } else {
      exec(`kill -9 ${process.id}`);
      setState(state.filter((p) => p.id !== process.id));
      message = `✅ Killed ${process.processName === "-" ? `process ${process.id}` : process.processName}`;
    }
    clearSearchBar({ forceScrollToTop: true });
    showHUD(message);
  };

  const subtitleString = (process: Process) => {
    let subtitle = undefined;

    if (shouldShowPID) {
      subtitle = process.id?.toString();
    }

    if (shouldShowPath) {
      subtitle = subtitle ? `${subtitle} - ${process.path}` : process.path;
    }

    return subtitle;
  };

  return (
    <List
      isLoading={state.length === 0}
      searchBarPlaceholder="Filter by name..."
      onSearchTextChange={(query) => setQuery(query)}
    >
      {state
        .filter((process) => {
          if (query == "" || query == undefined) {
            return true;
          }

          const name = process.type == "aggregatedApp" ? process.appName : process.processName;
          const nameMatches = name?.toLowerCase().includes(query.toLowerCase()) ?? false;
          const pathMatches =
            process.path?.toLowerCase().match(new RegExp(`.+${query}.*\\.[app|framework|prefpane]`, "ig")) != null;
          const pidMatches = process.id?.toString().includes(query) ?? false;

          return nameMatches || (shouldIncludePaths && pathMatches) || (shouldIncludePid && pidMatches);
        })
        .sort((a, b) => {
          // If this flag is true, we bring apps to the top, but only if we have a query.
          if (query != null && shouldPrioritizeAppsWhenFiltering) {
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
              title={(process.type == "aggregatedApp" ? process.appName : process.processName) ?? ""}
              subtitle={subtitleString(process)}
              icon={icon}
              accessoryTitle={
                sortByMem
                  ? `${process.cpu.toFixed(2)}% ${prettyBytes(process.mem * 1024)}`
                  : `${prettyBytes(process.mem * 1024)} ${process.cpu.toFixed(2)}%`
              }
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
  id: number | undefined;
  cpu: number;
  mem: number;
  type: "prefPane" | "app" | "binary" | "aggregatedApp";
  path: string | undefined;
  processName: string | undefined;
  appName: string | undefined;
};
