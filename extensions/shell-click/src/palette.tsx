import { CommandActions } from "./command-actions";
import { useOperation } from "./use-operation";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Color,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { callTool, loadSnapshot, navigate } from "./client";
import { matches, searchCommands, Snapshot, title } from "./model";
import { ListeningPort, scanPorts, terminatePort } from "./ports";

const toggleShortcut = { modifiers: ["cmd" as const], key: "return" as const };
const refreshShortcut = { modifiers: ["cmd" as const], key: "r" as const };

export default function Palette() {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    commands: [],
    workspaces: [],
  });
  const [ports, setPorts] = useState<ListeningPort[]>([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    try {
      if (filter === "ports") {
        const result = await scanPorts();
        if (current === generation.current) setPorts(result);
      } else {
        const result = await loadSnapshot();
        if (current === generation.current) setSnapshot(result);
      }
      if (current === generation.current) setError(undefined);
    } catch (error) {
      if (current === generation.current)
        setError(String(error instanceof Error ? error.message : error));
      throw error;
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [filter]);
  const perform = useOperation();
  useEffect(() => {
    void refresh().catch(() => {});
    return () => {
      generation.current++;
    };
  }, [refresh]);
  const matching = searchCommands(snapshot.commands, query);
  const visibleWorkspaces = snapshot.workspaces.filter(
    (workspace) =>
      !query.trim() ||
      matching.some((command) => workspace.commandIDs.includes(command.id)),
  );
  useEffect(() => {
    if (
      !["all", "running", "ports"].includes(filter) &&
      !visibleWorkspaces.some((workspace) => workspace.id === filter)
    )
      setFilter("all");
  }, [filter, visibleWorkspaces]);
  const commands = matching.filter(
    (command) =>
      filter === "all" ||
      (filter === "running"
        ? command.state?.status === "running"
        : command.workspaceIDs.includes(filter)),
  );
  const commonActions = (
    <ActionPanel.Section>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={refreshShortcut}
        onAction={() => perform("Refresh", refresh).then(() => {})}
      />
      <Action
        title="Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
  return (
    <List
      isLoading={loading}
      filtering={false}
      searchBarPlaceholder={
        filter === "ports" ? "Search ports" : "Search commands"
      }
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Running" value="running" />
          <List.Dropdown.Item title="Ports" value="ports" />
          {visibleWorkspaces.map((workspace) => (
            <List.Dropdown.Item
              key={workspace.id}
              title={workspace.name}
              value={workspace.id}
            />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          title="Couldn’t Load Shell Click"
          description={error}
          icon={Icon.ExclamationMark}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      ) : (
        <>
          <List.EmptyView
            title={
              query
                ? "No Results"
                : filter === "running"
                  ? "Nothing Running"
                  : filter === "ports"
                    ? "No Listening Ports"
                    : "No Commands"
            }
            description="Refresh with ⌘R, or change the search or filter."
            actions={<ActionPanel>{commonActions}</ActionPanel>}
          />
          {filter !== "ports" && (
            <List.Section title="Commands">
              {commands.map((command) => (
                <List.Item
                  key={command.id}
                  title={title(command)}
                  subtitle={command.command}
                  icon={{
                    source: Icon.Terminal,
                    tintColor:
                      command.state?.status === "running"
                        ? Color.Green
                        : Color.SecondaryText,
                  }}
                  accessories={[
                    ...command.detectedEndpoints.map((endpoint) => ({
                      text: String(endpoint.port),
                      tooltip: `${endpoint.scheme}://localhost:${endpoint.port}`,
                    })),
                    {
                      text: command.runtimeError
                        ? "Unavailable"
                        : command.state?.status === "running"
                          ? "Running"
                          : "Idle",
                      tooltip: command.runtimeError ?? command.workingDirectory,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Actions"
                        icon={Icon.List}
                        target={
                          <CommandActions
                            command={command}
                            perform={perform}
                            refresh={refresh}
                          />
                        }
                      />
                      {command.state && (
                        <Action
                          title={
                            command.state.status === "running"
                              ? "Stop"
                              : "Start"
                          }
                          icon={
                            command.state.status === "running"
                              ? Icon.Stop
                              : Icon.Play
                          }
                          shortcut={toggleShortcut}
                          onAction={() =>
                            perform(
                              command.state?.status === "running"
                                ? "Stop"
                                : "Start",
                              async () => {
                                await callTool(
                                  command.state?.status === "running"
                                    ? "stop_command"
                                    : "run_command",
                                  { id: command.id },
                                );
                                await refresh();
                              },
                            ).then(() => {})
                          }
                        />
                      )}
                      {commonActions}
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {filter === "ports" &&
            ports
              .filter((port) =>
                matches(
                  [
                    String(port.port),
                    String(port.pid),
                    port.address,
                    port.name,
                    port.path,
                  ],
                  query,
                ),
              )
              .map((port) => (
                <List.Item
                  key={port.id}
                  title={String(port.port)}
                  subtitle={port.name}
                  icon={Icon.Network}
                  accessories={[
                    { text: port.elapsed, tooltip: "Running for" },
                    {
                      text: port.path,
                      tooltip: `PID ${port.pid} · ${port.address}`,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        title="Open"
                        url={`http://localhost:${port.port}`}
                      />
                      {[false, true].map((force) => (
                        <Action
                          key={String(force)}
                          title={force ? "Force Kill Process" : "Kill Process"}
                          icon={force ? Icon.Bolt : Icon.XMarkCircle}
                          style={Action.Style.Destructive}
                          onAction={async () => {
                            if (
                              await confirmAlert({
                                title: `${force ? "Force kill" : "Kill"} ${port.name}?`,
                                message: `PID ${port.pid} on port ${port.port} will receive ${force ? "SIGKILL" : "SIGTERM"}.`,
                                primaryAction: {
                                  title: force ? "Force Kill" : "Kill Process",
                                  style: Alert.ActionStyle.Destructive,
                                },
                              })
                            )
                              await perform("Terminate Process", async () => {
                                await terminatePort(port, force);
                                await refresh();
                              });
                          }}
                        />
                      ))}
                      {commonActions}
                    </ActionPanel>
                  }
                />
              ))}
          {filter === "all" && (
            <List.Section title="Tabs">
              {[
                { id: "dashboard", title: "Commands", icon: Icon.AppWindow },
                { id: "settings", title: "Settings", icon: Icon.Gear },
              ]
                .filter((tab) =>
                  matches([tab.title, "tab", `go to ${tab.title}`], query),
                )
                .map((tab) => (
                  <List.Item
                    key={tab.id}
                    title={tab.title}
                    subtitle="Go to tab"
                    icon={tab.icon}
                    actions={
                      <ActionPanel>
                        <Action
                          title={`Open ${tab.title}`}
                          icon={tab.icon}
                          onAction={() =>
                            perform(`Open ${tab.title}`, () =>
                              navigate(`shell-click://tab/${tab.id}`),
                            ).then(() => {})
                          }
                        />
                        {commonActions}
                      </ActionPanel>
                    }
                  />
                ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
