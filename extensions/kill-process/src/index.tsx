import { Action, ActionPanel, clearSearchBar, getPreferenceValues, Icon, List, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { useState } from "react";
import useInterval from "./hooks/use-interval";

export default function ProcessList() {
  const [state, setState] = useState<Process[]>([]);
  const [query, setQuery] = useState<string | undefined>(undefined);

  const preferences = getPreferenceValues<Preferences>();
  const shouldIncludePaths = preferences.shouldSearchInPaths ?? false;
  const shouldIncludePid = preferences.shouldSearchInPid ?? false;
  const shouldPrioritizeAppsWhenFiltering = preferences.shouldPrioritizeAppsWhenFiltering ?? false;
  const shouldShowPID = preferences.shouldShowPID ?? false;
  const shouldShowPath = preferences.shouldShowPath ?? false;
  const refreshDuration = +(preferences.refreshDuration ?? 1000);

  const fetchProcesses = () => {
    exec(`ps -eo pid,pcpu,comm | sort -nrk 2,3`, (err, stdout) => {
      if (err != null) {
        return;
      }

      const processes = stdout
        .split("\n")
        .map((line) => {
          const [, id, cpu, path] = line.match(/(\d+)\s+(\d+[.|,]\d+)\s+(.*)/) ?? ["", "", "", ""];
          const name = path.match(/[^/]*[^/]*$/i)?.[0] ?? "";
          const isPrefPane = path.includes(".prefPane");
          const isApp = path.includes(".app");

          return {
            id,
            cpu,
            path,
            name,
            type: isPrefPane ? "prefPane" : isApp ? "app" : "binary",
          } as Process;
        })
        .filter((process) => process.name !== "");

      setState(processes);
    });
  };

  useInterval(() => {
    fetchProcesses();
  }, refreshDuration);

  const fileIcon = (process: Process) => {
    if (process.type === "prefPane") {
      return { fileIcon: process.path?.replace(/(.+\.prefPane)(.+)/, "$1") ?? "" };
    }

    if (process.type === "app") {
      return { fileIcon: process.path?.replace(/(.+\.app)(.+)/, "$1") ?? "" };
    }

    return "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/ExecutableBinaryIcon.icns";
  };

  const killProcess = (process: Process) => {
    exec(`kill -9 ${process.id}`);
    setState(state.filter((p) => p.id !== process.id));
    clearSearchBar({ forceScrollToTop: true });
    showHUD(`✅ Killed ${process.name === "-" ? `process ${process.id}` : process.name}`);
  };

  const copyToClipboardAction = (process: Process) => {
    return process.path == null ? null : <Action.CopyToClipboard title="Copy Path" content={process.path} />;
  };

  const subtitleString = (process: Process) => {
    let subtitle = undefined;

    if (shouldShowPID) {
      subtitle = process.id;
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
          if (query == null) {
            return true;
          }

          const nameMatches = process.name.toLowerCase().includes(query.toLowerCase());
          const pathMatches =
            process.path?.toLowerCase().match(new RegExp(`.+${query}.*\\.[app|framework|prefpane]`, "ig")) != null;
          const pidMatches = process.id.includes(query);

          return nameMatches || (shouldIncludePaths && pathMatches) || (shouldIncludePid && pidMatches);
        })
        .sort((a, b) => {
          // If this flag is true, we bring apps to the top, but only if we have a query.
          if (query != null && shouldPrioritizeAppsWhenFiltering) {
            if (a.type === "app" && b.type !== "app") {
              return -1;
            } else if (a.type !== "app" && b.type === "app") {
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
              title={process.name}
              subtitle={subtitleString(process)}
              icon={icon}
              accessories={[{ text: `${process.cpu}%` }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Item title="Kill" icon={Icon.XmarkCircle} onAction={() => killProcess(process)} />
                  {copyToClipboardAction(process)}
                  <ActionPanel.Item
                    title="Reload"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ key: "r", modifiers: ["cmd"] }}
                    onAction={() => fetchProcesses()}
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
  id: string;
  cpu: string;
  type: "prefPane" | "app" | "binary";
  path: string | undefined;
  name: string;
};
