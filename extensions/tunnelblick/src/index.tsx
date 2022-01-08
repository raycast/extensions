import { ActionPanel, Detail, List, PushAction, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript, runAppleScriptSync } from "run-applescript";

async function getVpnConnections() {
  const result = await runAppleScript(`
    tell application "Tunnelblick" to get configurations
  `)

  const connections = result.split(",").map(connection => {
    const name = connection.replace("configuration ", "").trim()
    const status = runAppleScriptSync(`
      tell application "Tunnelblick" to get state of first configuration where name = "${name}"
    `)

    return {
      name,
      status
    }
  })

  return connections
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true)
  const [connections, setConnections] = useState<any>([])

  useEffect(() => {
    getVpnConnections().then(connections => {
      setConnections(connections)
      setIsLoading(false)
    })
  }, [])

  return (
    <List isLoading={isLoading}>
      {connections.map((connection: any) => (
        <List.Item
          key={connection.name}
          icon={connection.status === "EXITING" ? "xmark-circle-16" : "checkmark-circle-16"}
          title={connection.name}
          subtitle={connection.status === "EXITING" ? "Connect" : "Disconnect"}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Connect"
                key={connection.name}
                onAction={() => {
                  if (connection.status === "EXITING") {
                    runAppleScriptSync(`tell application "Tunnelblick" to connect "${connection.name}"`)
                    showToast(ToastStyle.Success, "Connected")
                  } else {
                    runAppleScriptSync(`tell application "Tunnelblick" to disconnect "${connection.name}"`)
                    showToast(ToastStyle.Success, "Disconnected")
                  }
                  getVpnConnections().then(setConnections)
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
