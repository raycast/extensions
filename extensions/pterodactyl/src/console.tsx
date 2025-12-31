import { Action, ActionPanel, List, showToast, Toast, Icon, getPreferenceValues } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import WebSocket from "ws";
import { getWebsocketCredentials } from "./api/pterodactyl";
import { Server } from "./api/types";
import stripAnsi from "strip-ansi";

export default function ServerConsole({ server }: { server: Server }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function connect() {
      try {
        const { token, socket: socketUrl } = await getWebsocketCredentials(server.attributes.identifier);

        if (!isMounted) return;

        const preferences = getPreferenceValues();
        const origin = preferences.pterodactylUrl.endsWith("/")
          ? preferences.pterodactylUrl.slice(0, -1)
          : preferences.pterodactylUrl;

        const ws = new WebSocket(socketUrl, {
          headers: {
            Origin: origin,
          },
        });
        socketRef.current = ws;

        ws.on("open", () => {
          if (isMounted) setIsConnected(true);
          ws.send(JSON.stringify({ event: "auth", args: [token] }));
          setTimeout(() => {
            ws.send(JSON.stringify({ event: "send logs", args: [null] }));
          }, 500);
        });

        ws.on("message", (data) => {
          if (!isMounted) return;
          try {
            const parsed = JSON.parse(data.toString());
            if (parsed.event === "console output") {
              setLogs((prev) => [...prev, ...parsed.args]);
            } else if (parsed.event === "token expiring") {
              connect();
            }
          } catch {
            // Ignore parse errors
          }
        });

        ws.on("error", (error) => {
          console.error("WS Error", error);
          if (isMounted) {
            showToast({ style: Toast.Style.Failure, title: "WebSocket Error", message: String(error) });
            setIsConnected(false);
          }
        });

        ws.on("close", () => {
          if (isMounted) setIsConnected(false);
        });
      } catch (error) {
        if (isMounted) {
          showToast({ style: Toast.Style.Failure, title: "Failed to connect", message: String(error) });
        }
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [server.attributes.identifier]);

  const sendCommand = async () => {
    if (!command.trim()) return;
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify({ event: "send command", args: [command] }));
      setCommand("");
      showToast({ style: Toast.Style.Success, title: "Command sent" });
    } else {
      showToast({ style: Toast.Style.Failure, title: "Not connected" });
    }
  };

  const cleanLog = (log: string) => {
    let cleaned = stripAnsi(log);
    cleaned = cleaned.replace(/^\s*>\.\.\.\.\s*/, "");
    return cleaned.trim();
  };

  const reversedLogs = [...logs].reverse();

  return (
    <List
      navigationTitle={`Console: ${server.attributes.name}`}
      searchBarPlaceholder="Type a command..."
      searchText={command}
      onSearchTextChange={setCommand}
      throttle={false}
      isShowingDetail={logs.length > 0}
    >
      {logs.length === 0 && (
        <List.EmptyView
          title={isConnected ? "No logs yet..." : "Connecting..."}
          icon={isConnected ? Icon.Terminal : Icon.CircleProgress}
        />
      )}

      {reversedLogs.map((log, index) => {
        const cleaned = cleanLog(log);
        return (
          <List.Item
            key={`${index}-${log.substring(0, 10)}`}
            title={cleaned || " "}
            icon={Icon.Terminal}
            detail={
              <List.Item.Detail
                markdown={`\`\`\`\n${cleaned}\n\`\`\``}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Raw Length" text={String(log.length)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action title="Send Command" icon={Icon.Envelope} onAction={sendCommand} />
                <Action.CopyToClipboard content={cleaned} title="Copy Log Line" />
                <Action.CopyToClipboard content={logs.map(cleanLog).join("\n")} title="Copy All Logs" />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
