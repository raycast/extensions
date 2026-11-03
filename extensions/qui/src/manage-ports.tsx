import os from "node:os";
import path from "node:path";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  type Image,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { usePorts } from "~/hooks/use-ports";
import { killProcess, type ListeningPort, supportsGracefulTerminate } from "~/lib/ports";
import { stackIcon } from "~/lib/stack";

export default function ManagePorts() {
  const [showDetail, setShowDetail] = useState(true);
  const { ports: loaded, error, isLoading, refresh, whileKilling } = usePorts();
  const ports = loaded ?? [];
  // Until the first scan returns, show only the loading bar, not an empty state.
  const hasLoaded = loaded !== undefined;
  // A failed scan with nothing to show gets an error state, not an empty list.
  // If ports are already listed, a failed background poll keeps them.
  const failed = error !== undefined && ports.length === 0;

  async function terminate(item: ListeningPort, signal: "SIGTERM" | "SIGKILL") {
    const { pid, name } = item.process;
    const verb = !supportsGracefulTerminate ? "Ending" : signal === "SIGKILL" ? "Force killing" : "Terminating";
    const toast = await showToast({ style: Toast.Style.Animated, title: `${verb} ${name} (PID ${pid})` });
    try {
      const result = await whileKilling(pid, killProcess(pid, signal));
      if (result === "terminated") {
        toast.style = Toast.Style.Success;
        toast.title = `Freed port ${item.port}`;
        toast.message = `${name} (PID ${pid}) exited`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `${name} is still running`;
        toast.message = "It ignored SIGTERM";
        toast.primaryAction = {
          title: "Force Kill",
          onAction: () => forceKill(item),
        };
      }
    } catch (error) {
      await showFailureToast(error, { title: `Couldn't kill ${name}` });
    }
  }

  async function confirmTerminate(item: ListeningPort) {
    const { name, pid } = item.process;
    const confirmed = await confirmAlert(
      supportsGracefulTerminate
        ? {
            title: `Terminate ${name}?`,
            message: `PID ${pid} on port ${item.port} will be asked to quit with SIGTERM. Unsaved work in it may be lost.`,
            primaryAction: { title: "Terminate", style: Alert.ActionStyle.Destructive },
          }
        : {
            title: `End ${name}?`,
            message: `PID ${pid} on port ${item.port} will be stopped immediately, without a chance to clean up.`,
            primaryAction: { title: "End Process", style: Alert.ActionStyle.Destructive },
          },
    );
    if (confirmed) await terminate(item, "SIGTERM");
  }

  async function forceKill(item: ListeningPort) {
    const confirmed = await confirmAlert({
      title: `Force kill ${item.process.name}?`,
      message: `PID ${item.process.pid} on port ${item.port} will be stopped immediately with SIGKILL, without a chance to clean up.`,
      primaryAction: { title: "Force Kill", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await terminate(item, "SIGKILL");
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && ports.length > 0}
      searchBarPlaceholder="Filter by port, process, project or PID"
    >
      {failed ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Couldn't list ports"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      ) : (
        hasLoaded && !isLoading && <List.EmptyView icon={Icon.Network} title="No listening ports" />
      )}
      {ports.map((item) => (
        <PortItem
          key={item.id}
          item={item}
          showDetail={showDetail}
          onToggleDetail={() => setShowDetail((v) => !v)}
          onTerminate={() => confirmTerminate(item)}
          onForceKill={() => forceKill(item)}
          onRefresh={refresh}
        />
      ))}
    </List>
  );
}

function PortItem(props: {
  item: ListeningPort;
  showDetail: boolean;
  onToggleDetail: () => void;
  onTerminate: () => void;
  onForceKill: () => void;
  onRefresh: () => void;
}) {
  const { item, showDetail } = props;
  const proc = item.process;
  const project = projectName(item);
  const scope = bindScope(item.addresses);

  const accessories: List.Item.Accessory[] = showDetail
    ? []
    : [
        ...(project ? [{ tag: { value: project, color: Color.Purple }, tooltip: proc.cwd }] : []),
        { tag: { value: scope.label, color: scope.color }, tooltip: item.addresses.join(", ") },
        ...(proc.elapsedSeconds !== undefined
          ? [{ text: formatDuration(proc.elapsedSeconds), tooltip: "Uptime", icon: Icon.Clock }]
          : []),
        { text: String(proc.pid), tooltip: "PID" },
      ];

  return (
    <List.Item
      title={String(item.port)}
      subtitle={proc.name}
      icon={processIcon(item)}
      keywords={[
        proc.name,
        String(proc.pid),
        proc.command,
        project ?? "",
        proc.stack?.runtime?.name ?? "",
        proc.stack?.framework?.name ?? "",
      ].filter(Boolean)}
      accessories={accessories}
      detail={<PortDetail item={item} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {/* Raycast binds ↵ to the first action, so keep it harmless. */}
            <Action.OpenInBrowser title="Open in Browser" url={browserUrl(item)} />
            <Action
              title={showDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              onAction={props.onToggleDetail}
            />
            {proc.cwd && <Action.ShowInFinder title="Show Working Directory" path={proc.cwd} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={supportsGracefulTerminate ? "Terminate Process" : "End Process"}
              icon={supportsGracefulTerminate ? Icon.Stop : Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={props.onTerminate}
            />
            {supportsGracefulTerminate && (
              <Action
                title="Force Kill Process"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.RemoveAll}
                onAction={props.onForceKill}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Port"
              content={String(item.port)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              title="Copy PID"
              content={String(proc.pid)}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "p" },
                Windows: { modifiers: ["ctrl", "shift"], key: "p" },
              }}
            />
            <Action.CopyToClipboard
              title="Copy Command"
              content={proc.command}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            {proc.cwd && (
              <Action.CopyToClipboard
                title="Copy Working Directory"
                content={proc.cwd}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={props.onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function PortDetail({ item }: { item: ListeningPort }) {
  const proc = item.process;
  const chain = [...proc.ancestry, { pid: proc.pid, name: proc.name }];
  const markdown = ["```", proc.command, "```"].join("\n");

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Port" text={`${item.port}/${item.protocol}`} />
          <List.Item.Detail.Metadata.TagList title="Bound To">
            {item.addresses.map((address) => (
              <List.Item.Detail.Metadata.TagList.Item
                key={address}
                text={address === "*" ? "* (all interfaces)" : address}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Process" text={proc.name} icon={processIcon(item)} />
          {proc.stack?.framework && (
            <List.Item.Detail.Metadata.Label
              title="Framework"
              text={proc.stack.framework.name}
              icon={stackIcon(proc.stack.framework)}
            />
          )}
          {proc.stack?.runtime && (
            <List.Item.Detail.Metadata.Label
              title="Runtime"
              text={proc.stack.runtime.name}
              icon={stackIcon(proc.stack.runtime)}
            />
          )}
          <List.Item.Detail.Metadata.Label title="PID" text={String(proc.pid)} />
          {proc.user && <List.Item.Detail.Metadata.Label title="User" text={proc.user} />}
          {proc.elapsedSeconds !== undefined && (
            <List.Item.Detail.Metadata.Label
              title="Started"
              text={`${formatDuration(proc.elapsedSeconds)} ago · ${new Date(Date.now() - proc.elapsedSeconds * 1000).toLocaleString()}`}
            />
          )}
          {proc.rssKb !== undefined && (
            <List.Item.Detail.Metadata.Label title="Memory" text={formatMemory(proc.rssKb)} />
          )}
          <List.Item.Detail.Metadata.Separator />
          {proc.cwd && <List.Item.Detail.Metadata.Label title="Working Directory" text={tildify(proc.cwd)} />}
          {proc.git && (
            <List.Item.Detail.Metadata.Label
              title="Git"
              text={`${path.basename(proc.git.root)}${proc.git.branch ? ` @ ${proc.git.branch}` : ""}`}
              icon={Icon.CodeBlock}
            />
          )}
          <List.Item.Detail.Metadata.Label title="Started By" text={chain.map((p) => p.name).join(" → ")} />
          {proc.executable && <List.Item.Detail.Metadata.Label title="Executable" text={tildify(proc.executable)} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/** A short project label: the git repo name, or the cwd's folder if it's inside the home directory. */
function projectName(item: ListeningPort): string | undefined {
  const { git, cwd } = item.process;
  if (git) return path.basename(git.root);
  if (cwd?.startsWith(os.homedir() + path.sep)) return path.basename(cwd);
  return undefined;
}

const isLoopback = (a: string) => a === "localhost" || a.startsWith("127.") || a === "[::1]" || a === "::1";
const isWildcard = (a: string) => a === "*" || a === "0.0.0.0" || a === "[::]" || a === "::";

function bindScope(addresses: string[]): { label: string; color: Color } {
  if (addresses.every(isLoopback)) return { label: "localhost", color: Color.Green };
  if (addresses.some(isWildcard)) return { label: "network", color: Color.Orange };
  return { label: addresses[0], color: Color.Blue };
}

/**
 * Where to open the server: `localhost` when it listens on loopback or every
 * interface, otherwise the specific address it's bound to (IPv6 bracketed).
 */
function browserUrl(item: ListeningPort): string {
  if (item.addresses.some((a) => isLoopback(a) || isWildcard(a))) return `http://localhost:${item.port}`;
  // Drop any IPv6 zone (`%en0`), which browsers don't accept in URLs.
  const address = item.addresses[0].replace(/%[^\]]*/, "");
  const host = address.includes(":") && !address.startsWith("[") ? `[${address}]` : address;
  return `http://${host}:${item.port}`;
}

function processIcon(item: ListeningPort): Image.ImageLike {
  if (item.process.appBundle) return { fileIcon: item.process.appBundle };
  const { framework, runtime } = item.process.stack ?? {};
  if (framework) return stackIcon(framework);
  if (runtime) return stackIcon(runtime);
  if (item.process.git) return { source: Icon.Code, tintColor: Color.Purple };
  return { source: Icon.Terminal, tintColor: Color.SecondaryText };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function formatMemory(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  const mb = kb / 1024;
  return mb < 1024 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(2)} GB`;
}

function tildify(p: string): string {
  const home = os.homedir();
  return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
}
