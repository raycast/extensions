import { useState, useEffect } from "react";
import {
  List,
  Action,
  ActionPanel,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { exec } from "child_process";
import { findProcessesByPort, findAllListeningPorts } from "./utils/port";
import type { PortProcess } from "./types";

export default function KillByPort() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<PortProcess[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allPorts, setAllPorts] = useState<PortProcess[] | null>(null);

  const loadAllPorts = () => {
    setIsLoading(true);
    const ports = findAllListeningPorts();
    setAllPorts(ports);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAllPorts();
  }, []);

  const handleSearch = (text: string) => {
    setSearchText(text);
    const port = parseInt(text);

    if (!text.trim()) {
      loadAllPorts();
      setResults([]);
      return;
    }

    if (isNaN(port) || port < 1 || port > 65535) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const found = findProcessesByPort(port);
    setResults(found);
    setIsLoading(false);
  };

  const handleKill = (proc: PortProcess, force: boolean) => {
    const signal = force ? "-9 " : "";
    exec(`kill ${signal}${proc.pid}`, (err) => {
      if (err) {
        showToast({
          title: `Failed to kill ${proc.command}`,
          message: err.message,
          style: Toast.Style.Failure,
        });
        return;
      }
      showToast({
        title: `Killed ${proc.command} on port ${proc.port}`,
        style: Toast.Style.Success,
      });
      // Remove from results
      setResults((prev) => prev.filter((p) => p.pid !== proc.pid));
      setAllPorts((prev) =>
        prev ? prev.filter((p) => p.pid !== proc.pid) : prev,
      );
    });
  };

  const displayList = searchText.trim() ? results : (allPorts ?? []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter port number to find processes..."
      onSearchTextChange={handleSearch}
      throttle
    >
      {displayList.length === 0 && !isLoading && searchText.trim() ? (
        <List.EmptyView
          title="No processes found"
          description={`Nothing is listening on port ${searchText}`}
          icon={Icon.MagnifyingGlass}
        />
      ) : (
        <List.Section
          title={
            searchText.trim() ? `Port ${searchText}` : "All Listening Ports"
          }
          subtitle={`${displayList.length} processes`}
        >
          {displayList.map((proc) => (
            <List.Item
              key={`${proc.pid}-${proc.port}`}
              title={proc.command}
              subtitle={`PID: ${proc.pid}`}
              accessories={[
                { tag: { value: `Port ${proc.port}` } },
                { tag: proc.protocol },
              ]}
              icon={Icon.Globe}
              actions={
                <ActionPanel>
                  <Action
                    title="Kill"
                    icon={Icon.XMarkCircle}
                    onAction={() => handleKill(proc, false)}
                  />
                  <Action
                    title="Force Kill"
                    icon={Icon.XMarkCircleFilled}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => handleKill(proc, true)}
                  />
                  <Action.CopyToClipboard
                    title="Copy PID"
                    content={String(proc.pid)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Port"
                    content={String(proc.port)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
