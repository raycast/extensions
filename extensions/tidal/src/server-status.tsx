"use client";

import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { getServerStatus, startServer, stopServer, formatUptime, type ServerStatus } from "./lib/utils";

export default function ServerStatusCommand() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await getServerStatus();
      if (data) {
        setStatus(data);
        setError(null);
      } else {
        setError("Server not reachable");
        setStatus(null);
      }
    } catch (err) {
      console.error("Error fetching server status:", err);
      setError("Server not reachable");
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartServer = async () => {
    setIsLoading(true);
    await startServer();
    setTimeout(fetchStatus, 2000);
  };

  const handleStopServer = async () => {
    setIsLoading(true);
    await stopServer();
    setTimeout(fetchStatus, 1000);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return (
      <List>
        <List.Item
          title="Server Status"
          subtitle={error}
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Start Server" onAction={handleStartServer} icon={Icon.Play} />
              <Action title="Refresh" onAction={fetchStatus} icon={Icon.RotateClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List>
      <List.Section title="Server Status">
        <List.Item
          title="Server"
          subtitle={`Running on port ${status?.port}`}
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          accessories={[{ text: `Uptime: ${formatUptime(status?.uptime || 0)}` }]}
          actions={
            <ActionPanel>
              <Action title="Stop Server" onAction={handleStopServer} icon={Icon.Stop} />
              <Action title="Refresh" onAction={fetchStatus} icon={Icon.RotateClockwise} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Requests"
          subtitle={`${status?.requestCount} total requests`}
          icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
        />
      </List.Section>

      <List.Section title="Connections">
        <List.Item
          title="Chrome Extension"
          subtitle={status?.chromeConnected ? "Connected" : "Disconnected"}
          icon={{
            source: status?.chromeConnected ? Icon.CheckCircle : Icon.XMarkCircle,
            tintColor: status?.chromeConnected ? Color.Green : Color.Red,
          }}
          accessories={
            status?.lastTrackUpdate
              ? [{ text: `Last update: ${new Date(status.lastTrackUpdate).toLocaleTimeString()}` }]
              : [{ text: "No updates" }]
          }
        />
        <List.Item
          title="Raycast Extension"
          subtitle={status?.raycastConnected ? "Connected" : "Disconnected"}
          icon={{
            source: status?.raycastConnected ? Icon.CheckCircle : Icon.XMarkCircle,
            tintColor: status?.raycastConnected ? Color.Green : Color.Red,
          }}
          accessories={
            status?.lastCommandSent
              ? [{ text: `Last command: ${new Date(status.lastCommandSent).toLocaleTimeString()}` }]
              : [{ text: "No commands" }]
          }
        />
      </List.Section>

      <List.Section title="Current State">
        <List.Item
          title="Track"
          subtitle={
            status?.currentTrack?.title
              ? `${status.currentTrack.title} - ${status.currentTrack.artist}`
              : "No track data"
          }
          icon={{ source: Icon.Music, tintColor: Color.Purple }}
          accessories={
            status?.currentTrack?.isPlaying
              ? [{ text: "Playing", icon: { source: Icon.Play, tintColor: Color.Green } }]
              : [{ text: "Paused", icon: { source: Icon.Pause, tintColor: Color.Orange } }]
          }
        />
        <List.Item
          title="Pending Commands"
          subtitle={`${status?.pendingCommandsCount || 0} commands in queue`}
          icon={{ source: Icon.Terminal, tintColor: Color.Yellow }}
        />
      </List.Section>
    </List>
  );
}
