import { ActionPanel, List, showToast, Action, Toast, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript, runAppleScriptSync } from "run-applescript";
import { Connection } from "./types/connection";

async function getVpnConnections(): Promise<Connection[]> {
  try {
    const result = await runAppleScript(`
      tell application "Tunnelblick" to get configurations
    `);

    const connections = result.split(",").map((connection) => {
      const name = connection.replace("configuration ", "").trim();
      const status = runAppleScriptSync(`
      tell application "Tunnelblick" to get state of first configuration where name = "${name}"
    `);

      return {
        name,
        status,
      };
    });

    return connections;
  } catch {
    return new Promise((resolve, reject) =>
      reject("Couln't get VPN connections. Make sure you have Tunnelblick installed."),
    );
  }
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    showToast({
      style: Toast.Style.Animated,
      title: "Getting configurations",
    });
    getVpnConnections()
      .then((connections: Connection[]) => {
        setConnections(connections);
      })
      .catch((error) => {
        setError(new Error(error));
      })
      .finally(() => {
        Toast.prototype.hide();
        setIsLoading(false);
      });
  }, []);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: error.message,
    });
  }

  return (
    <List isLoading={isLoading}>
      {connections.map((connection) => (
        <List.Item
          key={connection.name}
          icon={connection.status === "EXITING" ? Icon.Network : { source: Icon.Network, tintColor: Color.Green }}
          title={connection.name}
          accessories={[
            {
              tag: {
                value: connection.status === "EXITING" ? "Disconnected" : "Connected",
                color: connection.status === "EXITING" ? Color.Red : Color.Green,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={connection.status === "EXITING" ? "Connect" : "Disconnect"}
                key={connection.name}
                icon={connection.status === "EXITING" ? Icon.Livestream : Icon.LivestreamDisabled}
                onAction={() => {
                  if (connection.status === "EXITING") {
                    runAppleScriptSync(`tell application "Tunnelblick" to connect "${connection.name}"`);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Connected",
                    });
                  } else {
                    runAppleScriptSync(`tell application "Tunnelblick" to disconnect "${connection.name}"`);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Disconnected",
                    });
                  }
                  getVpnConnections().then(setConnections);
                }}
              />
              <Action
                title="Disconnect All"
                icon={Icon.LivestreamDisabled}
                shortcut={{ modifiers: ["cmd"], key: "delete" }}
                key="disconnectAllConnections"
                onAction={() => {
                  runAppleScriptSync(`tell application "Tunnelblick" to disconnect all`);
                  showToast({
                    style: Toast.Style.Success,
                    title: "Disconnected",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
