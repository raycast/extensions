import { List, ActionPanel, Action, Icon, showToast, Toast, Color, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { startReceiveServer, stopReceiveServer, isServerRunning } from "./utils/receive-server";
import { getLocalIPs } from "./utils/localsend";

interface Preferences {
  httpPort: string;
  downloadPath: string;
  enableReceive: boolean;
}

export default function Command() {
  const [serverRunning, setServerRunning] = useState(false);
  const [localIPs, setLocalIPs] = useState<string[]>([]);
  const prefs = getPreferenceValues<Preferences>();
  const port = parseInt(prefs.httpPort || "53318", 10);

  useEffect(() => {
    setServerRunning(isServerRunning());
    setLocalIPs(getLocalIPs());

    if (prefs.enableReceive && !isServerRunning()) {
      handleStartServer();
    }
  }, []);

  const handleStartServer = async () => {
    try {
      await startReceiveServer(port);
      setServerRunning(true);
      await showToast({
        style: Toast.Style.Success,
        title: "Receive server started",
        message: `Listening on port ${port}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start server",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleStopServer = async () => {
    try {
      await stopReceiveServer();
      setServerRunning(false);
      await showToast({
        style: Toast.Style.Success,
        title: "Receive server stopped",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop server",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List>
      <List.Section title="Server Status">
        <List.Item
          icon={serverRunning ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.XMarkCircle}
          title={serverRunning ? "Server Running" : "Server Stopped"}
          subtitle={serverRunning ? `Port ${port}` : "Not receiving files"}
          accessories={[
            {
              tag: {
                value: serverRunning ? "ACTIVE" : "INACTIVE",
                color: serverRunning ? Color.Green : Color.Red,
              },
            },
          ]}
          actions={
            <ActionPanel>
              {serverRunning ? (
                <Action title="Stop Server" icon={Icon.Stop} onAction={handleStopServer} />
              ) : (
                <Action title="Start Server" icon={Icon.Play} onAction={handleStartServer} />
              )}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Configuration">
        <List.Item
          icon={Icon.Network}
          title="Port"
          subtitle={port.toString()}
          accessories={[{ text: "Configure in preferences" }]}
        />
        <List.Item
          icon={Icon.Folder}
          title="Download Folder"
          subtitle={prefs.downloadPath}
          accessories={[{ text: "Configure in preferences" }]}
        />
        <List.Item
          icon={Icon.Globe}
          title="Auto-start on Enable"
          subtitle={prefs.enableReceive ? "Enabled" : "Disabled"}
          accessories={[{ text: "Configure in preferences" }]}
        />
      </List.Section>

      {localIPs.length > 0 && (
        <List.Section title="Local IP Addresses">
          {localIPs.map((ip) => (
            <List.Item
              key={ip}
              icon={Icon.Network}
              title={ip}
              subtitle={`http://${ip}:${port}`}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy IP Address" content={ip} />
                  <Action.CopyToClipboard title="Copy Full URL" content={`http://${ip}:${port}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
