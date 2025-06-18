import { ActionPanel, clearSearchBar, Icon, List, popToRoot, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";
import { fetchProcessesWithPorts, ProcessWithPorts } from "./helpers/fetchProcessesWithPorts";
import { Process } from "./helpers/fetchProcesses";
import { revealInFinder } from "./helpers/revealInFinder";

export default function ProcessList() {
  const [state, setState] = useState<ProcessWithPorts[]>([]);
  const [query, setQuery] = useState<string | undefined>(undefined);

  const refetch = async () => {
    const process = await fetchProcessesWithPorts();
    setState(process);
  };

  useEffect(() => {
    refetch();
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
    popToRoot();
    showHUD(`✅ Killed ${process.name === "-" ? `process ${process.id}` : process.name}`);
  };

  return (
    <List
      isLoading={state.length === 0}
      searchBarPlaceholder="Filter by name or port..."
      onSearchTextChange={(query) => setQuery(query)}
    >
      {state
        .filter((process) => {
          if (query == null) return true;

          const nameMatches = process.name.toLowerCase().includes(query.toLowerCase());
          const pathMatches =
            process.path?.toLowerCase().match(new RegExp(`.+${query}.*\\.[app|framework|prefpane]`, "ig")) != null;
          const pidMatches = process.id.includes(query);
          const portMatches = process.ports.some((port) => port.toString().includes(query));

          return nameMatches || pathMatches || pidMatches || portMatches;
        })
        .sort((a, b) => {
          // If this flag is true, we bring apps to the top, but only if we have a query.
          if (a.type === "app" && b.type !== "app") {
            return -1;
          } else if (a.type !== "app" && b.type === "app") {
            return 1;
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
              icon={icon}
              accessories={[
                ...(process.ports.length ? [{ text: process.ports.join(", "), icon: Icon.Plug }] : []),
                { text: `${process.cpu}%`, icon: Icon.ComputerChip },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Item title="Kill" icon={Icon.XmarkCircle} onAction={() => killProcess(process)} />
                  <ActionPanel.Item
                    title="Reload"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ key: "r", modifiers: ["cmd"] }}
                    onAction={() => refetch()}
                  />
                  {process.path && (
                    <ActionPanel.Item
                      title="Reveal in Finder"
                      icon={Icon.Finder}
                      shortcut={{ key: "r", modifiers: ["cmd", "opt"] }}
                      onAction={() => process.path && revealInFinder(process.path)}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
