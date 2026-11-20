import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import Logs from "./logs";
import {
  Action as DaemonAction,
  Daemon,
  daemonActions,
  daemonUrl,
  groupActions,
  groupTargets,
  isSupervisorDown,
  nameOf,
  namespaceOf,
} from "./model";
import { listDaemons, MissingBinaryError, startSupervisor } from "./pitchfork";
import { ACTION_ICON, PENDING, runAction, statusColor, statusIcon, VERB } from "./ui";

const ALL = "__all__";
const SHORTCUTS: Record<DaemonAction, Keyboard.Shortcut> = {
  start: { modifiers: ["cmd"], key: "s" },
  stop: { modifiers: ["cmd"], key: "." },
  restart: { modifiers: ["cmd", "shift"], key: "r" },
};

export default function Command() {
  const { data, error, isLoading, revalidate } = useCachedPromise(listDaemons, [], {
    keepPreviousData: true,
    onError: () => {},
  });
  const [pending, setPending] = useState<Record<string, DaemonAction>>({});
  const [namespace, setNamespace] = useState(ALL);

  useEffect(() => {
    const timer = setInterval(revalidate, 2500);
    return () => clearInterval(timer);
  }, [revalidate]);

  async function act(action: DaemonAction, ids: string[], label: string) {
    setPending((current) => ({ ...current, ...Object.fromEntries(ids.map((id) => [id, action])) }));
    try {
      await runAction(action, ids, label);
    } finally {
      // Status is the truth, not the exit code: drop the pending marks only after a fresh read.
      await revalidate();
      setPending((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.includes(id))));
    }
  }

  const daemons = error ? [] : (data ?? []);
  const namespaces = [...new Set(daemons.map(namespaceOf))].sort();
  const shown = daemons.filter((d) => namespace === ALL || namespaceOf(d) === namespace);
  const groups = namespaces
    .map((ns) => [ns, shown.filter((d) => namespaceOf(d) === ns)] as const)
    .filter(([, ds]) => ds.length);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter daemons by name"
      searchBarAccessory={
        <List.Dropdown tooltip="Namespace" storeValue onChange={setNamespace}>
          <List.Dropdown.Item title="All Namespaces" value={ALL} />
          <List.Dropdown.Section>
            {namespaces.map((ns) => (
              <List.Dropdown.Item key={ns} title={ns} value={ns} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error ? (
        <Failure error={error} onRecover={revalidate} />
      ) : (
        <>
          {!isLoading && !daemons.length && (
            <List.EmptyView
              icon={Icon.Tray}
              title="No daemons"
              description="Start a daemon with Pitchfork once and it shows up here."
            />
          )}
          {groups.map(([ns, members]) => (
            <List.Section
              key={ns}
              title={ns}
              subtitle={`${members.filter((d) => d.status === "running").length}/${members.length} running`}
            >
              {members.map((daemon) => (
                <DaemonItem
                  key={daemon.id}
                  daemon={daemon}
                  pending={pending[daemon.id]}
                  group={members.filter((d) => !pending[d.id])}
                  namespace={ns}
                  act={act}
                  refresh={revalidate}
                />
              ))}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}

function DaemonItem(props: {
  daemon: Daemon;
  pending?: DaemonAction;
  group: Daemon[];
  namespace: string;
  act: (action: DaemonAction, ids: string[], label: string) => Promise<void>;
  refresh: () => void;
}) {
  const { daemon, pending, group, namespace, act, refresh } = props;
  const url = daemonUrl(daemon);
  const actions = pending ? [] : daemonActions(daemon);
  const status = pending ? PENDING[pending] : daemon.status;
  const accessories: List.Item.Accessory[] = [
    ...(daemon.error ? [{ icon: { source: Icon.Warning, tintColor: Color.Red }, tooltip: daemon.error }] : []),
    ...(daemon.oneshot ? [{ tag: "oneshot" }] : []),
    ...(daemon.disabled ? [{ tag: "disabled" }] : []),
    ...(daemon.uptime ? [{ text: daemon.uptime, tooltip: `pid ${daemon.pid}` }] : []),
    { tag: { value: status, color: pending ? Color.Blue : statusColor(daemon.status) } },
  ];
  const lifecycle = actions.map((action) => (
    <Action
      key={action}
      title={VERB[action]}
      icon={ACTION_ICON[action]}
      shortcut={SHORTCUTS[action]}
      onAction={() => act(action, [daemon.id], nameOf(daemon))}
    />
  ));
  const open = url && <Action.OpenInBrowser key="open" url={url} />;
  const logs = (
    <Action.Push
      key="logs"
      title="Show Logs"
      icon={Icon.Terminal}
      target={<Logs id={daemon.id} />}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
    />
  );

  return (
    <List.Item
      id={daemon.id}
      icon={statusIcon(daemon, pending)}
      title={nameOf(daemon)}
      subtitle={url?.replace(/^https?:\/\//, "") ?? (daemon.active_port ? `:${daemon.active_port}` : undefined)}
      keywords={[daemon.id, namespace]}
      accessories={accessories}
      actions={
        <ActionPanel title={daemon.id}>
          <ActionPanel.Section>
            {daemon.status === "running" ? [open, logs, ...lifecycle] : [...lifecycle, logs]}
          </ActionPanel.Section>
          <ActionPanel.Section title={`Namespace ${namespace}`}>
            {groupActions(group).map((action) => (
              <Action
                key={action}
                title={`${VERB[action]} All in ${namespace}`}
                icon={ACTION_ICON[action]}
                onAction={() => act(action, groupTargets(group, action), `${namespace} daemons`)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy ID" content={daemon.id} shortcut={Keyboard.Shortcut.Common.Copy} />
            {url && (
              <Action.CopyToClipboard
                title="Copy URL"
                content={url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />
            )}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={refresh}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function Failure({ error, onRecover }: { error: Error; onRecover: () => void }) {
  if (error instanceof MissingBinaryError) {
    return (
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Pitchfork not found"
        description={error.message}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.OpenInBrowser title="Install Pitchfork" url="https://pitchfork.jdx.dev" />
          </ActionPanel>
        }
      />
    );
  }
  if (isSupervisorDown(error.message)) {
    return (
      <List.EmptyView
        icon={Icon.Power}
        title="Pitchfork's supervisor isn't running"
        description="Start it to see and control your daemons."
        actions={
          <ActionPanel>
            <Action
              title="Start Supervisor"
              icon={Icon.Play}
              onAction={async () => {
                const toast = await showToast({ style: Toast.Style.Animated, title: "Starting supervisor" });
                try {
                  await startSupervisor();
                  await toast.hide();
                } catch (e) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Could not start the supervisor";
                  toast.message = String(e instanceof Error ? e.message : e);
                }
                onRecover();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List.EmptyView
      icon={{ source: Icon.Warning, tintColor: Color.Red }}
      title="Could not read Pitchfork"
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRecover} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
