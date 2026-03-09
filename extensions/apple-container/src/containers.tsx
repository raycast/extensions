import {
  List,
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Keyboard,
  open,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useMemo } from "react";
import { CONTAINER_BIN, parseContainerList, Container, containerExec, isSystemContainer } from "./lib/container";
import { relativeTime, statusIcon, formatCpus, formatMemory, formatMountType } from "./lib/format";
import { openTerminalWithCommand } from "./lib/terminal";
import ContainerLogs from "./container-logs";
import ExecCommand from "./exec-command";

interface Stack {
  network: string;
  containers: Container[];
  runningCount: number;
}

export default function Containers() {
  const { isLoading, data, revalidate } = useExec(CONTAINER_BIN, ["list", "--format", "json"], {
    keepPreviousData: true,
  });

  const containers = useMemo(() => parseContainerList(data || ""), [data]);

  const { stacks, system } = useMemo(() => {
    const userContainers = containers.filter((c) => !isSystemContainer(c));
    const systemContainers = containers.filter(isSystemContainer);

    const grouped = new Map<string, Container[]>();
    for (const c of userContainers) {
      const key = c.networkName;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(c);
    }

    const stackList: Stack[] = [];
    for (const [network, ctrs] of grouped) {
      stackList.push({
        network,
        containers: ctrs,
        runningCount: ctrs.filter((c) => c.status === "running").length,
      });
    }

    return { stacks: stackList, system: systemContainers };
  }, [containers]);

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search containers...">
      {containers.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Box} title="No Containers" description="Run a container to get started." />
      ) : (
        <>
          {stacks.map((stack) => {
            const subtitle =
              stack.runningCount === stack.containers.length
                ? `${stack.runningCount} running`
                : `${stack.runningCount}/${stack.containers.length} running`;
            return (
              <List.Section key={stack.network} title={stack.network} subtitle={subtitle}>
                {stack.containers.map((c) => (
                  <ContainerItem key={c.name} container={c} stack={stack.containers} onAction={revalidate} />
                ))}
              </List.Section>
            );
          })}
          {system.length > 0 && (
            <List.Section title="System" subtitle={`${system.length}`}>
              {system.map((c) => (
                <ContainerItem key={c.name} container={c} stack={[]} onAction={revalidate} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function ContainerDetail({ container }: { container: Container }) {
  const c = container;
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Status" text={c.status} icon={statusIcon(c.status)} />
          <List.Item.Detail.Metadata.Label title="Image" text={c.image} />
          {c.startedAt && <List.Item.Detail.Metadata.Label title="Uptime" text={relativeTime(c.startedAt)} />}
          <List.Item.Detail.Metadata.Label title="Platform" text={c.platform || "—"} />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="CPU" text={formatCpus(c.cpus)} />
          <List.Item.Detail.Metadata.Label title="Memory" text={formatMemory(c.memoryInBytes)} />
          <List.Item.Detail.Metadata.Separator />

          {c.ports.length > 0 && (
            <>
              <List.Item.Detail.Metadata.TagList title="Ports">
                {c.ports.map((p) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={`${p.hostPort}:${p.containerPort}`}
                    text={`${p.hostPort}:${p.containerPort}/${p.protocol}`}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
            </>
          )}

          <List.Item.Detail.Metadata.Label title="Network" text={c.networkName} />
          {c.ipv4Address && <List.Item.Detail.Metadata.Label title="IPv4" text={c.ipv4Address} />}
          {c.hostname && <List.Item.Detail.Metadata.Label title="Hostname" text={c.hostname} />}
          <List.Item.Detail.Metadata.Separator />

          {c.mounts.length > 0 && (
            <>
              <List.Item.Detail.Metadata.TagList title="Mounts">
                {c.mounts.map((m) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={m.destination}
                    text={`${formatMountType(m.type)} → ${m.destination}`}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
            </>
          )}

          {c.environment.length > 0 && (
            <>
              {c.environment.slice(0, 8).map((env) => {
                const eq = env.indexOf("=");
                const key = eq > 0 ? env.slice(0, eq) : env;
                const val = eq > 0 ? env.slice(eq + 1) : "";
                return <List.Item.Detail.Metadata.Label key={key} title={key} text={val || '""'} />;
              })}
              {c.environment.length > 8 && (
                <List.Item.Detail.Metadata.Label title="" text={`+${c.environment.length - 8} more`} />
              )}
              <List.Item.Detail.Metadata.Separator />
            </>
          )}

          {(c.rosetta || c.readOnly || c.ssh || c.useInit) && (
            <List.Item.Detail.Metadata.TagList title="Flags">
              {c.rosetta && <List.Item.Detail.Metadata.TagList.Item text="Rosetta" color={Color.Blue} />}
              {c.readOnly && <List.Item.Detail.Metadata.TagList.Item text="Read-Only" color={Color.Orange} />}
              {c.ssh && <List.Item.Detail.Metadata.TagList.Item text="SSH" color={Color.Purple} />}
              {c.useInit && <List.Item.Detail.Metadata.TagList.Item text="Init" color={Color.SecondaryText} />}
            </List.Item.Detail.Metadata.TagList>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function ContainerItem({
  container,
  stack,
  onAction,
}: {
  container: Container;
  stack: Container[];
  onAction: () => void;
}) {
  return (
    <List.Item
      icon={statusIcon(container.status)}
      title={container.name}
      subtitle={container.image}
      detail={<ContainerDetail container={container} />}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Logs"
            icon={Icon.Terminal}
            target={<ContainerLogs name={container.name} container={container} />}
          />
          {container.status === "running" ? (
            <Action
              title="Stop"
              icon={{ source: Icon.Stop, tintColor: Color.Red }}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => lifecycleAction("stop", container.name, onAction)}
            />
          ) : (
            <Action
              title="Start"
              icon={{ source: Icon.Play, tintColor: Color.Green }}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => lifecycleAction("start", container.name, onAction)}
            />
          )}
          <Action
            title="Restart"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={async () => {
              const toast = await showToast(Toast.Style.Animated, `Restarting ${container.name}...`);
              try {
                await containerExec(["stop", container.name]);
                await containerExec(["start", container.name]);
                toast.style = Toast.Style.Success;
                toast.title = `Restarted ${container.name}`;
                onAction();
              } catch (e) {
                toast.style = Toast.Style.Failure;
                toast.title = `Failed to restart`;
                toast.message = String(e);
              }
            }}
          />
          <Action.Push
            title="Inspect"
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={<InspectView name={container.name} />}
          />
          {container.ports.length > 0 && (
            <Action
              title="Open Port"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() => open(`http://localhost:${container.ports[0].hostPort}`)}
            />
          )}
          {container.status === "running" && (
            <>
              <Action
                title="Open Shell"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                onAction={async () => {
                  try {
                    await openTerminalWithCommand(`${CONTAINER_BIN} exec -it ${container.name} /bin/sh`);
                  } catch (e) {
                    await showToast(Toast.Style.Failure, "Failed to open terminal", String(e));
                  }
                }}
              />
              <Action.Push
                title="Run Command"
                icon={Icon.CommandSymbol}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                target={<ExecCommand containerName={container.name} />}
              />
            </>
          )}
          <Action.CopyToClipboard title="Copy Name" content={container.name} shortcut={Keyboard.Shortcut.Common.Copy} />
          {container.ipv4Address && (
            <Action.CopyToClipboard
              title="Copy IP Address"
              content={container.ipv4Address.split("/")[0]}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
          {container.environment.length > 0 && (
            <Action.CopyToClipboard title="Copy Environment" content={container.environment.join("\n")} />
          )}
          <Action
            title="Delete"
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: `Delete ${container.name}?`,
                  message: "This will stop and remove the container.",
                  primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                })
              ) {
                const toast = await showToast(Toast.Style.Animated, `Deleting ${container.name}...`);
                try {
                  if (container.status === "running") {
                    await containerExec(["stop", container.name]);
                  }
                  await containerExec(["rm", container.name]);
                  toast.style = Toast.Style.Success;
                  toast.title = `Deleted ${container.name}`;
                  onAction();
                } catch (e) {
                  toast.style = Toast.Style.Failure;
                  toast.title = `Failed to delete`;
                  toast.message = String(e);
                }
              }
            }}
          />

          {stack.length > 1 && (
            <ActionPanel.Section title="Stack">
              <Action
                title="Stop Stack"
                icon={{ source: Icon.Stop, tintColor: Color.Red }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                onAction={() => stackLifecycle("stop", stack, onAction)}
              />
              <Action
                title="Start Stack"
                icon={{ source: Icon.Play, tintColor: Color.Green }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                onAction={() => stackLifecycle("start", stack, onAction)}
              />
              <Action
                title="Restart Stack"
                icon={Icon.ArrowClockwise}
                onAction={async () => {
                  await stackLifecycle("stop", stack, () => {});
                  await stackLifecycle("start", stack, onAction);
                }}
              />
              <Action
                title="Delete Stack"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const network = container.networkName;
                  const names = stack.map((c) => c.name).join(", ");
                  if (
                    await confirmAlert({
                      title: `Delete stack "${network}"?`,
                      message: `This will stop and remove: ${names}`,
                      primaryAction: { title: "Delete Stack", style: Alert.ActionStyle.Destructive },
                    })
                  ) {
                    const toast = await showToast(Toast.Style.Animated, `Deleting stack ${network}...`);
                    try {
                      for (const c of stack) {
                        if (c.status === "running") await containerExec(["stop", c.name]);
                        await containerExec(["rm", c.name]);
                      }
                      await containerExec(["network", "delete", network]).catch(() => {});
                      toast.style = Toast.Style.Success;
                      toast.title = `Deleted stack ${network}`;
                      onAction();
                    } catch (e) {
                      toast.style = Toast.Style.Failure;
                      toast.title = `Failed to delete stack`;
                      toast.message = String(e);
                    }
                  }
                }}
              />
            </ActionPanel.Section>
          )}

          <ActionPanel.Section title="System">
            <Action
              title="Prune Stopped Containers"
              icon={Icon.Trash}
              onAction={() => pruneAction("prune", "stopped containers", onAction)}
            />
            <Action
              title="Prune Unused Images"
              icon={Icon.Trash}
              onAction={() => pruneAction("image prune", "unused images", onAction)}
            />
            <Action
              title="Prune Unused Volumes"
              icon={Icon.Trash}
              onAction={() => pruneAction("volume prune", "unused volumes", onAction)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function InspectView({ name }: { name: string }) {
  const { isLoading, data } = useExec(CONTAINER_BIN, ["inspect", name]);

  let formatted = "";
  if (data) {
    try {
      formatted = "```json\n" + JSON.stringify(JSON.parse(data), null, 2) + "\n```";
    } catch {
      formatted = "```\n" + data + "\n```";
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${name} — Inspect`}
      markdown={formatted}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={data || ""} />
        </ActionPanel>
      }
    />
  );
}

async function lifecycleAction(action: "start" | "stop", name: string, onDone: () => void) {
  const label = action === "start" ? "Starting" : "Stopping";
  const toast = await showToast(Toast.Style.Animated, `${label} ${name}...`);
  try {
    await containerExec([action, name]);
    toast.style = Toast.Style.Success;
    toast.title = `${action === "start" ? "Started" : "Stopped"} ${name}`;
    onDone();
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to ${action}`;
    toast.message = String(e);
  }
}

async function stackLifecycle(action: "start" | "stop", stack: Container[], onDone: () => void) {
  const targets = stack.filter((c) => (action === "stop" ? c.status === "running" : c.status !== "running"));
  if (targets.length === 0) return;
  const label = action === "start" ? "Starting" : "Stopping";
  const toast = await showToast(Toast.Style.Animated, `${label} ${targets.length} containers...`);
  try {
    for (const c of targets) {
      await containerExec([action, c.name]);
    }
    toast.style = Toast.Style.Success;
    toast.title = `${action === "start" ? "Started" : "Stopped"} ${targets.length} containers`;
    onDone();
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to ${action} stack`;
    toast.message = String(e);
  }
}

async function pruneAction(cmd: string, label: string, onDone: () => void) {
  if (
    await confirmAlert({
      title: `Prune ${label}?`,
      message: `This will remove ${label}.`,
      primaryAction: { title: "Prune", style: Alert.ActionStyle.Destructive },
    })
  ) {
    const toast = await showToast(Toast.Style.Animated, `Pruning ${label}...`);
    try {
      await containerExec(cmd.split(" "));
      toast.style = Toast.Style.Success;
      toast.title = `Pruned ${label}`;
      onDone();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to prune`;
      toast.message = String(e);
    }
  }
}
