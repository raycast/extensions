import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { Unavailable } from "./components/Unavailable";
import { abbreviate } from "./lib/format";
import { hub } from "./lib/hub";
import { LocalServer, PinnedStatus } from "./lib/types";

async function runServerCommand(args: string[], done: string, onChange: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `${done}…` });
  try {
    await hub(args, { timeout: 30_000 });
    toast.style = Toast.Style.Success;
    toast.title = done;
    onChange();
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't do that" });
  }
}

function Logs(props: { pinned: PinnedStatus }) {
  const { data, isLoading, revalidate } = usePromise(
    (name: string) => hub<string[]>(["logs", name, "-n", "300"]),
    [props.pinned.server.id],
  );
  return (
    <Detail
      navigationTitle={`${props.pinned.server.name} logs`}
      isLoading={isLoading}
      markdown={"```\n" + (data ?? []).slice(-300).join("\n") + "\n```"}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action.CopyToClipboard title="Copy Logs" content={(data ?? []).join("\n")} />
        </ActionPanel>
      }
    />
  );
}

function stateText(status: PinnedStatus): { text: string; color: Color } {
  const state = status.state;
  if ("running" in state)
    return { text: state.running.managed ? "Running" : "Running outside Office Space", color: Color.Green };
  if ("starting" in state) return { text: "Starting", color: Color.Yellow };
  if ("exited" in state) return { text: `Exited (${state.exited.code})`, color: Color.Red };
  return { text: "Stopped", color: Color.SecondaryText };
}

function ServerActions(props: { server: LocalServer; onChange: () => void; pinned?: PinnedStatus }) {
  const { server, onChange } = props;
  const url = `http://localhost:${server.ports[0]}`;
  return (
    <>
      <Action.OpenInBrowser url={url} />
      <Action.CopyToClipboard title="Copy URL" content={url} />
      {!props.pinned && !server.pinnedID && (
        <Action
          title="Pin Server"
          icon={Icon.Pin}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={() => runServerCommand(["pin", `${server.ports[0]}`], "Pinned", onChange)}
        />
      )}
      {(server.project?.rootPath ?? server.launchDirectory) && (
        <Action.Open
          title="Open Folder in Cursor"
          icon={Icon.Code}
          target={server.project?.rootPath ?? server.launchDirectory ?? ""}
          application="Cursor"
        />
      )}
      <Action
        title="Stop"
        icon={Icon.Stop}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={() => runServerCommand(["stop", `${server.ports[0]}`], `Stopped ${server.process.name}`, onChange)}
      />
      <Action
        title="Force Kill"
        icon={Icon.XMarkCircle}
        style={Action.Style.Destructive}
        onAction={async () => {
          const confirmed = await confirmAlert({
            title: `Force kill ${server.process.name} (pid ${server.process.pid})?`,
            primaryAction: { title: "Kill", style: Alert.ActionStyle.Destructive },
          });
          if (confirmed) await runServerCommand(["kill", `${server.ports[0]}`], "Killed", onChange);
        }}
      />
    </>
  );
}

export default function Command() {
  const servers = useCachedPromise(() => hub<LocalServer[]>(["servers"]), [], {
    keepPreviousData: true,
    onError: () => undefined,
  });
  const pinned = useCachedPromise(() => hub<PinnedStatus[]>(["pinned"]), [], {
    keepPreviousData: true,
    onError: () => undefined,
  });
  const refresh = () => {
    servers.revalidate();
    pinned.revalidate();
  };
  useEffect(() => {
    const timer = setInterval(refresh, 4000);
    return () => clearInterval(timer);
  }, []);
  const running = (servers.data ?? []).filter((server) => !server.pinnedID);
  const error = servers.error ?? pinned.error;

  return (
    <List isLoading={servers.isLoading || pinned.isLoading} searchBarPlaceholder="Search by port, project or framework">
      {error && !servers.data ? (
        <Unavailable error={error} />
      ) : (
        <>
          <List.EmptyView icon={Icon.HardDrive} title="No dev servers running" />
          <List.Section title="Pinned">
            {(pinned.data ?? []).map((status) => {
              const state = stateText(status);
              const isRunning = "running" in status.state || "starting" in status.state;
              return (
                <List.Item
                  key={status.server.id}
                  icon={{ source: Icon.Pin, tintColor: state.color }}
                  title={status.server.name}
                  subtitle={status.live?.health?.pageTitle ?? status.server.command}
                  keywords={[`${status.server.port ?? ""}`, status.server.workingDirectory]}
                  accessories={[
                    ...(status.server.port ? [{ text: `:${status.server.port}` }] : []),
                    { tag: { value: state.text, color: state.color } },
                  ]}
                  actions={
                    <ActionPanel>
                      {isRunning ? (
                        <>
                          {status.live && <ServerActions server={status.live} pinned={status} onChange={refresh} />}
                          <Action
                            title="Restart"
                            icon={Icon.ArrowClockwise}
                            shortcut={Keyboard.Shortcut.Common.Refresh}
                            onAction={() =>
                              runServerCommand(
                                ["restart", status.server.id],
                                `Restarted ${status.server.name}`,
                                refresh,
                              )
                            }
                          />
                        </>
                      ) : (
                        <Action
                          title="Start"
                          icon={Icon.Play}
                          onAction={() =>
                            runServerCommand(["start", status.server.id], `Started ${status.server.name}`, refresh)
                          }
                        />
                      )}
                      <Action.Push
                        title="Show Logs"
                        icon={Icon.Terminal}
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                        target={<Logs pinned={status} />}
                      />
                      <Action.ShowInFinder path={status.server.workingDirectory} />
                      <Action
                        title="Unpin"
                        icon={Icon.PinDisabled}
                        onAction={() =>
                          runServerCommand(["unpin", status.server.id], `Unpinned ${status.server.name}`, refresh)
                        }
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
          <List.Section title="Running">
            {running.map((server) => (
              <List.Item
                key={`${server.process.pid}-${server.ports.join(",")}`}
                icon={{ source: Icon.Globe, tintColor: server.health?.reachable === false ? Color.Red : Color.Green }}
                title={`:${server.ports[0]}  ${server.project?.name ?? server.process.name}`}
                subtitle={server.health?.pageTitle ?? server.framework?.displayName ?? ""}
                keywords={[
                  ...server.ports.map(String),
                  server.framework?.displayName ?? "",
                  server.project?.branch ?? "",
                ]}
                accessories={[
                  ...(server.project?.branch
                    ? [{ tag: { value: server.project.branch, color: Color.SecondaryText } }]
                    : []),
                  { text: server.framework?.displayName ?? server.process.name },
                  ...(server.launchDirectory
                    ? [{ tooltip: abbreviate(server.launchDirectory), icon: Icon.Folder }]
                    : []),
                ]}
                actions={
                  <ActionPanel>
                    <ServerActions server={server} onChange={refresh} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
