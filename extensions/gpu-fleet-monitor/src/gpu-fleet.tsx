import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getHosts } from "./lib/ssh-config";
import { probeHostsStreaming, getTmuxSessions } from "./lib/monitor";
import {
  connectTerminal,
  connectTerminalTmux,
  connectEditor,
  sshCommand,
  sshTmuxCommand,
  TERMINAL_LABELS,
  EDITOR_LABELS,
} from "./lib/actions";
import { HostStatus, SSHHost, TerminalApp, EditorApp, getExcludedHosts } from "./lib/types";
import {
  HostGroup,
  HostGroupOverrides,
  getGroups,
  getHostOverrides,
  getLastFilter,
  setLastFilter,
  setHostGroups,
} from "./lib/groups";
import { AddHostForm } from "./add-host";
import { ManageGroupsView } from "./manage-groups";
import { quickConnect } from "./quick-connect";

export default function GpuFleet() {
  const prefs = getPreferenceValues<Preferences>();
  const timeout = parseInt(prefs.sshTimeout || "6", 10) || 6;
  const refreshSec = parseInt(prefs.refreshInterval || "10", 10) || 10;
  const terminal: TerminalApp = prefs.terminalApp || "ghostty";
  const editor: EditorApp = prefs.editorApp || "cursor";

  const [groups, setGroups] = useState<HostGroup[]>([]);
  const [overrides, setOverrides] = useState<HostGroupOverrides>({});
  const [viewFilter, setViewFilter] = useState<string>("all");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [statuses, setStatuses] = useState<Map<string, HostStatus>>(new Map());
  const [pendingCount, setPendingCount] = useState(0);
  const cancelRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reloadGroupData = useCallback(async () => {
    const [g, o] = await Promise.all([getGroups(), getHostOverrides()]);
    setGroups(g);
    setOverrides(o);
  }, []);

  useEffect(() => {
    Promise.all([getGroups(), getHostOverrides(), getLastFilter()]).then(([g, o, f]) => {
      setGroups(g);
      setOverrides(o);
      setViewFilter(f);
      setDataLoaded(true);
    });
  }, []);

  const allHosts = useMemo(() => {
    if (!dataLoaded) return [];
    try {
      return getHosts({
        groups,
        overrides,
        excludedHosts: getExcludedHosts(prefs.excludedHosts),
      });
    } catch (err) {
      console.error("getHosts failed:", err);
      return [];
    }
  }, [groups, overrides, dataLoaded, prefs.excludedHosts]);

  const filteredHosts = useMemo(() => {
    if (viewFilter === "all") return allHosts;
    return allHosts.filter((h) => h.groups.includes(viewFilter));
  }, [allHosts, viewFilter]);

  const startProbing = useCallback(() => {
    if (cancelRef.current) cancelRef.current();
    if (timerRef.current) clearTimeout(timerRef.current);

    let remaining = filteredHosts.length;
    setPendingCount(remaining);

    const { cancel } = probeHostsStreaming(filteredHosts, timeout, (status) => {
      setStatuses((prev) => {
        const next = new Map(prev);
        next.set(status.host.name, status);
        return next;
      });
      remaining--;
      setPendingCount(remaining);

      if (remaining <= 0) {
        timerRef.current = setTimeout(startProbing, refreshSec * 1000);
      }
    });

    cancelRef.current = cancel;
  }, [filteredHosts, timeout, refreshSec]);

  useEffect(() => {
    if (!dataLoaded) return;
    startProbing();
    return () => {
      if (cancelRef.current) cancelRef.current();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startProbing, dataLoaded]);

  const handleFilterChange = useCallback((v: string) => {
    setViewFilter(v);
    setLastFilter(v);
  }, []);

  const { free, busy, noGpu, offline, scanning } = useMemo(() => {
    const free: HostStatus[] = [];
    const busy: HostStatus[] = [];
    const noGpu: HostStatus[] = [];
    const offline: HostStatus[] = [];
    const scanning: SSHHost[] = [];

    for (const host of filteredHosts) {
      const status = statuses.get(host.name);
      if (!status) {
        scanning.push(host);
        continue;
      }
      switch (status.state) {
        case "free":
          free.push(status);
          break;
        case "busy":
          busy.push(status);
          break;
        case "no-gpu":
          noGpu.push(status);
          break;
        default:
          offline.push(status);
      }
    }

    return { free, busy, noGpu, offline, scanning };
  }, [filteredHosts, statuses]);

  const isLoading = !dataLoaded || pendingCount > 0;

  const { push } = useNavigation();

  const globalActions = (
    <ActionPanel.Section title="Fleet">
      <Action
        title="Add Host"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={() => push(<AddHostForm groups={groups} onHostAdded={reloadGroupData} />)}
      />
      <Action
        title="Quick Connect Best Gpu"
        icon={Icon.Bolt}
        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
        onAction={() => quickConnect(filteredHosts, terminal, timeout)}
      />
      <Action
        title="Manage Groups"
        icon={Icon.Tag}
        shortcut={{ modifiers: ["cmd"], key: "g" }}
        onAction={() => push(<ManageGroupsView groups={groups} onGroupsChanged={reloadGroupData} />)}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={startProbing}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Filter hosts" value={viewFilter} onChange={handleFilterChange}>
          <List.Dropdown.Item title="All" value="all" />
          {groups.map((g) => (
            <List.Dropdown.Item key={g.id} title={g.name} value={g.id} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Quick Actions">
        <List.Item
          key="__add-host"
          icon={Icon.Plus}
          title="Add Host"
          subtitle="Add a new SSH host"
          detail={
            <List.Item.Detail
              markdown={["## Add Host", "", "Paste an SSH connection string to add a new host to your fleet."].join(
                "\n",
              )}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Add Host"
                icon={Icon.Plus}
                onAction={() => push(<AddHostForm groups={groups} onHostAdded={reloadGroupData} />)}
              />
              {globalActions}
            </ActionPanel>
          }
        />
        <List.Item
          key="__manage-groups"
          icon={Icon.Tag}
          title="Manage Groups"
          subtitle={`${groups.length} group${groups.length !== 1 ? "s" : ""}`}
          detail={
            <List.Item.Detail
              markdown={[
                "## Manage Groups",
                "",
                "Create, edit, or delete host groups.",
                "",
                groups
                  .map((g) => `- **${g.name}**${g.patterns.length > 0 ? ` (${g.patterns.join(", ")})` : ""}`)
                  .join("\n") || "No groups yet.",
              ].join("\n")}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Manage Groups"
                icon={Icon.Tag}
                onAction={() => push(<ManageGroupsView groups={groups} onGroupsChanged={reloadGroupData} />)}
              />
              {globalActions}
            </ActionPanel>
          }
        />
        <List.Item
          key="__quick-connect"
          icon={Icon.Bolt}
          title="Quick Connect Best GPU"
          subtitle={`Scan ${filteredHosts.length} hosts`}
          detail={
            <List.Item.Detail
              markdown={[
                "## Quick Connect",
                "",
                "Scan all hosts in the current view and connect to the best available free GPU.",
              ].join("\n")}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Quick Connect Best Gpu"
                icon={Icon.Bolt}
                onAction={() => quickConnect(filteredHosts, terminal, timeout)}
              />
              {globalActions}
            </ActionPanel>
          }
        />
      </List.Section>
      {scanning.length > 0 && (
        <List.Section title={`Scanning (${scanning.length})`}>
          {scanning.map((host) => (
            <List.Item
              key={host.name}
              icon={{ source: Icon.CircleProgress, tintColor: Color.Blue }}
              title={host.name}
              subtitle="connecting..."
              detail={<List.Item.Detail markdown={["## " + host.name, "", "Scanning..."].join("\n")} />}
              actions={
                <ActionPanel>
                  <Action
                    title={`Connect Via ${TERMINAL_LABELS[terminal]}`}
                    icon={Icon.Terminal}
                    onAction={async () => {
                      await closeMainWindow();
                      connectTerminal(terminal, host);
                    }}
                  />
                  <Action.CopyToClipboard title="Copy Ssh Command" content={sshCommand(host)} />
                  {globalActions}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {free.length > 0 && (
        <List.Section title={`Free (${free.length})`}>
          {free.map((s) => (
            <HostItem
              key={s.host.name}
              status={s}
              timeout={timeout}
              terminal={terminal}
              editor={editor}
              groups={groups}
              overrides={overrides}
              onGroupsChanged={reloadGroupData}
              globalActions={globalActions}
            />
          ))}
        </List.Section>
      )}
      {busy.length > 0 && (
        <List.Section title={`Busy (${busy.length})`}>
          {busy.map((s) => (
            <HostItem
              key={s.host.name}
              status={s}
              timeout={timeout}
              terminal={terminal}
              editor={editor}
              groups={groups}
              overrides={overrides}
              onGroupsChanged={reloadGroupData}
              globalActions={globalActions}
            />
          ))}
        </List.Section>
      )}
      {noGpu.length > 0 && (
        <List.Section title={`No GPU (${noGpu.length})`}>
          {noGpu.map((s) => (
            <HostItem
              key={s.host.name}
              status={s}
              timeout={timeout}
              terminal={terminal}
              editor={editor}
              groups={groups}
              overrides={overrides}
              onGroupsChanged={reloadGroupData}
              globalActions={globalActions}
            />
          ))}
        </List.Section>
      )}
      {offline.length > 0 && (
        <List.Section title={`Offline (${offline.length})`}>
          {offline.map((s) => (
            <HostItem
              key={s.host.name}
              status={s}
              timeout={timeout}
              terminal={terminal}
              editor={editor}
              groups={groups}
              overrides={overrides}
              onGroupsChanged={reloadGroupData}
              globalActions={globalActions}
            />
          ))}
        </List.Section>
      )}
      {dataLoaded && filteredHosts.length === 0 && (
        <List.Section title="Hosts">
          <List.Item
            key="__no-hosts"
            icon={Icon.ExclamationMark}
            title="No hosts found"
            subtitle="Check your SSH config or group settings"
            detail={
              <List.Item.Detail
                markdown={[
                  "## No Hosts Found",
                  "",
                  "No SSH hosts matched the current filter. Try:",
                  "- Switching to **All** in the dropdown",
                  "- Adding hosts via **Add Host**",
                  "- Adjusting group patterns in **Manage Groups**",
                ].join("\n")}
              />
            }
            actions={<ActionPanel>{globalActions}</ActionPanel>}
          />
        </List.Section>
      )}
    </List>
  );
}

function stateIcon(state: HostStatus["state"]): {
  source: Icon;
  tintColor: Color;
} {
  switch (state) {
    case "free":
      return { source: Icon.CircleFilled, tintColor: Color.Green };
    case "busy":
      return { source: Icon.CircleFilled, tintColor: Color.Yellow };
    case "no-gpu":
      return { source: Icon.CircleFilled, tintColor: Color.Orange };
    default:
      return { source: Icon.CircleFilled, tintColor: Color.Red };
  }
}

function gpuCountLabel(s: HostStatus): string {
  if (s.gpus.length === 0) return "";
  const name = s.gpus[0].name || "GPU";
  return s.gpus.length === 1 ? `1 ${name}` : `${s.gpus.length}x ${name}`;
}

function formatMB(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}GB`;
  return `${Math.round(mb)}MB`;
}

function detailMarkdown(s: HostStatus): string {
  if (s.state === "offline") {
    const lines = [`## ${s.host.name}`, "", "**Status:** Offline"];
    if (s.error) {
      lines.push("", "```", s.error, "```");
    }
    return lines.join("\n");
  }

  if (s.state === "no-gpu") {
    const lines: string[] = [];
    lines.push(`## ${s.host.name}`);
    lines.push("");
    lines.push("**Status:** Online (no GPU detected)");
    lines.push("");
    if (s.cpuUtilization > 0) {
      lines.push(`**CPU** ${Math.round(s.cpuUtilization)}%`);
      lines.push("");
    }
    if (s.topCpuCwd) {
      lines.push(`**CPU process** (PID ${s.topCpuPid}):`);
      lines.push(`\`${s.topCpuCwd}\``);
      lines.push("");
    }
    const updated = s.lastUpdated ? new Date(s.lastUpdated).toLocaleTimeString() : "never";
    lines.push(`---`);
    lines.push(`*${updated}*`);
    return lines.join("\n");
  }

  const lines: string[] = [];
  lines.push(`## ${s.host.name}`);
  lines.push("");

  const hasProcesses = s.topGpuCwd || s.topCpuCwd;
  if (hasProcesses) {
    if (s.topGpuCwd) {
      lines.push(`**GPU process** (PID ${s.topGpuPid}):`);
      lines.push(`\`${s.topGpuCwd}\``);
      lines.push("");
    }
    if (s.topCpuCwd) {
      lines.push(`**CPU process** (PID ${s.topCpuPid}):`);
      lines.push(`\`${s.topCpuCwd}\``);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  lines.push(
    `**CPU** ${Math.round(s.cpuUtilization)}% · **GPU** ${formatMB(s.gpuMemoryUsed)}/${formatMB(s.gpuMemoryTotal)} (${Math.round(s.gpuUtilization)}%)`,
  );
  lines.push("");

  if (s.gpus.length > 1) {
    lines.push("| # | Model | Mem | Util |");
    lines.push("|---|-------|-----|------|");
    s.gpus.forEach((g, i) => {
      const memPct = g.memoryTotal > 0 ? Math.round((g.memoryUsed / g.memoryTotal) * 100) : 0;
      lines.push(
        `| ${i} | ${g.name} | ${formatMB(g.memoryUsed)}/${formatMB(g.memoryTotal)} (${memPct}%) | ${Math.round(g.utilization)}% |`,
      );
    });
    lines.push("");
  }

  const updated = s.lastUpdated ? new Date(s.lastUpdated).toLocaleTimeString() : "never";
  lines.push(`---`);
  lines.push(`*${updated}*`);

  return lines.join("\n");
}

function HostItem({
  status,
  timeout,
  terminal,
  editor,
  groups,
  overrides,
  onGroupsChanged,
  globalActions,
}: {
  status: HostStatus;
  timeout: number;
  terminal: TerminalApp;
  editor: EditorApp;
  groups: HostGroup[];
  overrides: HostGroupOverrides;
  onGroupsChanged: () => void;
  globalActions: React.ReactNode;
}) {
  const { push } = useNavigation();
  const s = status;
  const hostOverrides = overrides[s.host.name] || [];

  async function toggleGroup(groupId: string) {
    const current = new Set(hostOverrides);
    if (current.has(groupId)) {
      current.delete(groupId);
    } else {
      current.add(groupId);
    }
    await setHostGroups(s.host.name, Array.from(current));
    onGroupsChanged();
  }

  return (
    <List.Item
      icon={stateIcon(s.state)}
      title={s.host.name}
      subtitle={gpuCountLabel(s)}
      detail={<List.Item.Detail markdown={detailMarkdown(s)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Connect">
            <Action
              title={`Connect Via ${TERMINAL_LABELS[terminal]}`}
              icon={Icon.Terminal}
              onAction={async () => {
                await closeMainWindow();
                connectTerminal(terminal, s.host);
              }}
            />
            <Action
              title={`Connect Via ${EDITOR_LABELS[editor]}`}
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={() => {
                connectEditor(editor, s.host);
                showToast({
                  title: `Opening ${EDITOR_LABELS[editor]} for ${s.host.name}...`,
                });
              }}
            />
            <Action
              title="Tmux Sessions"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              onAction={() => {
                push(<TmuxSessionList host={s.host} timeout={timeout} terminal={terminal} />);
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Groups">
            <ActionPanel.Submenu
              title="Assign to Group"
              icon={Icon.Tag}
              shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
            >
              {groups.map((g) => (
                <Action
                  key={g.id}
                  title={g.name}
                  icon={hostOverrides.includes(g.id) ? Icon.CheckCircle : Icon.Circle}
                  onAction={() => toggleGroup(g.id)}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
          <ActionPanel.Section title="Other">
            <Action.CopyToClipboard
              title="Copy Ssh Command"
              content={sshCommand(s.host)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
          {globalActions}
        </ActionPanel>
      }
    />
  );
}

function TmuxSessionList({ host, timeout, terminal }: { host: SSHHost; timeout: number; terminal: TerminalApp }) {
  const [sessions, setSessions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getTmuxSessions(host, timeout).then((s) => {
      if (!cancelled) {
        setSessions(s);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [host, timeout]);

  return (
    <List isLoading={isLoading} navigationTitle={`Tmux sessions on ${host.name}`}>
      {sessions.length === 0 && !isLoading && (
        <List.EmptyView title="No tmux sessions" description={`No active tmux sessions on ${host.name}`} />
      )}
      {sessions.map((session) => (
        <List.Item
          key={session}
          icon={Icon.Terminal}
          title={session}
          actions={
            <ActionPanel>
              <Action
                title={`Attach in ${TERMINAL_LABELS[terminal]}`}
                icon={Icon.Terminal}
                onAction={async () => {
                  await closeMainWindow();
                  connectTerminalTmux(terminal, host, session);
                }}
              />
              <Action.CopyToClipboard title="Copy Tmux Attach Command" content={sshTmuxCommand(host, session)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
