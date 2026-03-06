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
import {
  HostStatus,
  SSHHost,
  TerminalApp,
  EditorApp,
  getExcludedHosts,
  parseIdentityList,
} from "./lib/types";

export default function GpuFleet() {
  const prefs = getPreferenceValues<Preferences>();
  const timeout = parseInt(prefs.sshTimeout || "6", 10) || 6;
  const refreshSec = parseInt(prefs.refreshInterval || "10", 10) || 10;
  const terminal: TerminalApp = prefs.terminalApp || "ghostty";
  const editor: EditorApp = prefs.editorApp || "cursor";

  const [viewFilter, setViewFilter] = useState<string>(
    prefs.defaultView || "work",
  );
  const [statuses, setStatuses] = useState<Map<string, HostStatus>>(new Map());
  const [pendingCount, setPendingCount] = useState(0);
  const cancelRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allHosts = useMemo(
    () =>
      getHosts({
        workPatterns: prefs.workPatterns,
        personalPatterns: prefs.personalPatterns,
        workIdentityFiles: parseIdentityList(prefs.workIdentityFiles),
        personalIdentityFiles: parseIdentityList(prefs.personalIdentityFiles),
        excludedHosts: getExcludedHosts(prefs.excludedHosts),
      }),
    [
      prefs.workPatterns,
      prefs.personalPatterns,
      prefs.workIdentityFiles,
      prefs.personalIdentityFiles,
      prefs.excludedHosts,
    ],
  );

  const filteredHosts = useMemo(() => {
    if (viewFilter === "all") return allHosts;
    return allHosts.filter((h) => h.category === viewFilter);
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
    startProbing();
    return () => {
      if (cancelRef.current) cancelRef.current();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startProbing]);

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

  const isLoading = pendingCount > 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter hosts"
          value={viewFilter}
          onChange={(v) => {
            setViewFilter(v);
          }}
        >
          <List.Dropdown.Item title="Work" value="work" />
          <List.Dropdown.Item title="Personal" value="personal" />
          <List.Dropdown.Item title="All" value="all" />
        </List.Dropdown>
      }
    >
      {scanning.length > 0 && (
        <List.Section title={`Scanning (${scanning.length})`}>
          {scanning.map((host) => (
            <List.Item
              key={host.name}
              icon={{ source: Icon.CircleProgress, tintColor: Color.Blue }}
              title={host.name}
              subtitle="connecting..."
              detail={
                <List.Item.Detail markdown={`## ${host.name}\n\nScanning...`} />
              }
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
                  <Action.CopyToClipboard
                    title="Copy Ssh Command"
                    content={sshCommand(host)}
                  />
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
            />
          ))}
        </List.Section>
      )}
      {filteredHosts.length === 0 && (
        <List.EmptyView
          title="No hosts found"
          description="Check your SSH config or adjust host patterns in preferences."
        />
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
    return `## ${s.host.name}\n\n**Status:** Offline\n\n${s.error ? `\`\`\`\n${s.error}\n\`\`\`` : ""}`;
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
    const updated = s.lastUpdated
      ? new Date(s.lastUpdated).toLocaleTimeString()
      : "never";
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
      const memPct =
        g.memoryTotal > 0
          ? Math.round((g.memoryUsed / g.memoryTotal) * 100)
          : 0;
      lines.push(
        `| ${i} | ${g.name} | ${formatMB(g.memoryUsed)}/${formatMB(g.memoryTotal)} (${memPct}%) | ${Math.round(g.utilization)}% |`,
      );
    });
    lines.push("");
  }

  const updated = s.lastUpdated
    ? new Date(s.lastUpdated).toLocaleTimeString()
    : "never";
  lines.push(`---`);
  lines.push(`*${updated}*`);

  return lines.join("\n");
}

function HostItem({
  status,
  timeout,
  terminal,
  editor,
}: {
  status: HostStatus;
  timeout: number;
  terminal: TerminalApp;
  editor: EditorApp;
}) {
  const { push } = useNavigation();
  const s = status;

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
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              onAction={() => {
                push(
                  <TmuxSessionList
                    host={s.host}
                    timeout={timeout}
                    terminal={terminal}
                  />,
                );
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Other">
            <Action.CopyToClipboard
              title="Copy Ssh Command"
              content={sshCommand(s.host)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function TmuxSessionList({
  host,
  timeout,
  terminal,
}: {
  host: SSHHost;
  timeout: number;
  terminal: TerminalApp;
}) {
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
    <List
      isLoading={isLoading}
      navigationTitle={`Tmux sessions on ${host.name}`}
    >
      {sessions.length === 0 && !isLoading && (
        <List.EmptyView
          title="No tmux sessions"
          description={`No active tmux sessions on ${host.name}`}
        />
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
              <Action.CopyToClipboard
                title="Copy Tmux Attach Command"
                content={sshTmuxCommand(host, session)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
