import {
  Action,
  ActionPanel,
  Alert,
  clearSearchBar,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";
import useInterval from "./hooks/use-interval";
import { PortProcess } from "./types";
import { getFileIcon, getKillCommand, getPlatformSpecificErrorHelp } from "./utils/platform";
import { fetchPortProcesses } from "./utils/process";

export default function PortProcessList() {
  const [state, setState] = useState<PortProcess[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");

  const preferences = getPreferenceValues<Preferences>();
  const refreshDuration = +preferences.refreshDuration;
  const closeWindowAfterKill = preferences.closeWindowAfterKill;
  const clearSearchBarAfterKill = preferences.clearSearchBarAfterKill;
  const goToRootAfterKill = preferences.goToRootAfterKill;
  const skipConfirmation = preferences.skipConfirmation;

  const fetchProcesses = () => {
    fetchPortProcesses()
      .then((processes) => {
        setState(processes);
        setIsLoading(false);
      })
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch port processes",
          message: error instanceof Error ? error.message : String(error),
        });
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  useInterval(() => {
    fetchProcesses();
  }, refreshDuration);

  const onKill = async (process: PortProcess, force = false) => {
    const kill = () => {
      const command = getKillCommand(process.id, force);

      exec(command, (error) => {
        if (error) {
          const errorHelp = getPlatformSpecificErrorHelp(force);
          showToast({
            style: Toast.Style.Failure,
            title: errorHelp.title,
            message: errorHelp.message,
          });
          return;
        }

        showToast({
          style: Toast.Style.Success,
          title: "Killed process",
          message: `${process.processName} (Port: ${process.port}, PID: ${process.id})`,
        });

        if (closeWindowAfterKill) {
          closeMainWindow();
        }

        if (clearSearchBarAfterKill) {
          clearSearchBar();
        }

        if (goToRootAfterKill) {
          popToRoot();
        }

        fetchProcesses();
      });
    };

    if (skipConfirmation) {
      kill();
      return;
    }

    if (
      await confirmAlert({
        title: force ? "Force Kill Process?" : "Kill Process?",
        message: `Are you sure you want to ${force ? "force " : ""}kill ${process.processName} listening on port ${process.port}?`,
        primaryAction: {
          title: force ? "Force Kill" : "Kill",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      kill();
    }
  };

  const filteredProcesses = state.filter((p) => {
    const searchStr = `${p.port} ${p.processName} ${p.commandLine || ""} ${p.id}`.toLowerCase();
    return searchStr.includes(query.toLowerCase());
  });

  // Sort by port number
  const sortedProcesses = [...filteredProcesses].sort((a, b) => a.port - b.port);

  const truncatePath = (path: string, maxLength = 60) => {
    if (!path || path.length <= maxLength) return path;
    const parts = path.split("/");
    if (parts.length <= 3) return path;
    // Keep more context for the tail
    return `.../${parts.slice(-4).join("/")}`;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by port, process name, or command line..."
      onSearchTextChange={setQuery}
      throttle
    >
      {sortedProcesses.map((p) => {
        const title = `Port: ${p.port}`;

        // Smarter command line display for node/npm/pnpm
        let displayCommandLine = p.commandLine || p.processName;
        if (p.processName === "node" && p.commandLine) {
          // If it's node, the most important part is after the node binary
          const nodeArgs = p.commandLine.split(/\s+/).slice(1).join(" ");
          if (nodeArgs) {
            displayCommandLine = `node ${nodeArgs}`;
          }
        }

        const subtitle = truncatePath(displayCommandLine);

        return (
          <List.Item
            key={`${p.id}-${p.port}`}
            icon={getFileIcon(p)}
            title={title}
            subtitle={subtitle}
            accessories={[
              { text: `PID: ${p.id}`, tooltip: "Process ID" },
              { text: p.protocol, tooltip: "Protocol" },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Kill Process"
                    icon={Icon.Trash}
                    onAction={() => onKill(p)}
                    shortcut={{ modifiers: ["ctrl"], key: "k" }}
                  />
                  <Action
                    title="Force Kill Process"
                    icon={Icon.Trash}
                    onAction={() => onKill(p, true)}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "k" }}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Port"
                    content={String(p.port)}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy PID"
                    content={String(p.id)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  {p.commandLine && <Action.CopyToClipboard title="Copy Command Line" content={p.commandLine} />}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
