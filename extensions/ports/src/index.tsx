import { Action, ActionPanel, List, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchPorts } from "../lib/fetchPorts";
import { killProcess } from "../lib/killProcess";

interface PortInfo {
  localAddress: string;
  pid: string;
  processName?: string;
}

export default function Command() {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPorts(setPorts, setLoading);
  }, []);

  const handleKillProcess = (pid: string) => {
    killProcess(pid, () => {
      // Refresh the list after killing the process
      fetchPorts(setPorts, setLoading);
    });
  };

  const refreshPorts = () => {
    setLoading(true);
    fetchPorts(setPorts, setLoading);
    showToast({
      style: Toast.Style.Success,
      title: "List Updated",
      message: "Ports Refreshed",
    });
  };

  return (
    <List isLoading={loading} searchBarPlaceholder="Search port, PID or Process Name">
      {ports.map((port, index) => (
        <List.Item
          key={index}
          title={port.localAddress}
          subtitle={`PID: ${port.pid}`}
          accessories={port.processName ? [{ text: port.processName }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Kill Process"
                onAction={() => handleKillProcess(port.pid)}
                icon={Icon.Trash}
                shortcut={{
                  windows: { modifiers: ["ctrl", "shift"], key: "k" },
                  macOS: { modifiers: ["cmd", "shift"], key: "k" },
                }}
              />
              <Action
                title="Refresh List"
                onAction={refreshPorts}
                icon={Icon.ArrowClockwise}
                shortcut={{
                  windows: { modifiers: ["ctrl", "shift"], key: "r" },
                  macOS: { modifiers: ["cmd", "shift"], key: "r" },
                }}
              />
              <Action.CopyToClipboard content={port.processName || ""} title="Copy Name Process" />
              <Action.CopyToClipboard content={port.localAddress} title="Copy Address" />
              <Action.CopyToClipboard content={port.pid} title="Copy Pid" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
