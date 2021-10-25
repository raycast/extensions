import { ActionPanel, clearSearchBar, CopyToClipboardAction, Icon, List, preferences, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";

export default function ProcessList() {
  const [state, setState] = useState<Process[]>([]);
  const [query, setQuery] = useState<string | undefined>(undefined);
  const shouldIncludePaths = (preferences.shouldSearchInPaths?.value as boolean) ?? false;
  const shouldPrioritizeAppsWhenFiltering = (preferences.shouldPrioritizeAppsWhenFiltering?.value as boolean) ?? false;

  useEffect(() => {
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
  }, []);

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
    return process.path == null ? null : <CopyToClipboardAction title="Copy Path" content={process.path} />;
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

          return nameMatches || (shouldIncludePaths && pathMatches);
        })
        .sort((a, b) => {
          // If this flag is true, we bring apps to the top.
          if (shouldPrioritizeAppsWhenFiltering) {
            if (a.type === "app" && b.type !== "app") {
              return -1;
            } else if (a.type !== "app" && b.type === "app") {
              return 1;
            }
          }

          // Otherwise, we leave the order as it is.
          return 0;
        })
        .map((process, index) => {
          const icon = fileIcon(process);
          return (
            <List.Item
              key={index}
              title={process.name}
              subtitle={process.id}
              icon={icon}
              accessoryTitle={process.cpu}
              actions={
                <ActionPanel>
                  <ActionPanel.Item title="Kill" icon={Icon.XmarkCircle} onAction={() => killProcess(process)} />
                  {copyToClipboardAction(process)}
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
