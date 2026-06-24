import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  caffeinate,
  cliNotFoundPath,
  findSessions,
  isCliNotFound,
  killPid,
  pausePid,
  resumePid,
  uncaffeinate,
  type AgentSession,
  type PortRow,
} from "./ports";
import { SetupGuide } from "./setup";

function rowAccessories(r: PortRow): List.Item.Accessory[] {
  const out: List.Item.Accessory[] = [];
  if (r.caffeinated) {
    out.push({
      tag: { value: "awake", color: Color.Yellow },
      tooltip: r.caffeinateWatcher
        ? `caffeinate watcher pid ${r.caffeinateWatcher}`
        : undefined,
    });
  }
  if (r.parentCommand) out.push({ text: r.parentCommand });
  if (r.age) out.push({ text: r.age, tooltip: "process age" });
  return out;
}

function sectionTitle(s: AgentSession): string {
  const tail = (s.workspaceLabel || "—").split("/").slice(-2).join("/");
  const status = s.allCaffeinated
    ? "all awake"
    : s.anyCaffeinated
      ? `${s.caffeinatedPids.length}/${s.pids.length} awake`
      : "idle";
  return `${s.provider} — ${tail} · ${status}`;
}

async function forEachPid(pids: number[], fn: (pid: number) => Promise<void>) {
  for (const pid of pids) {
    try {
      await fn(pid);
    } catch {
      /* keep going */
    }
  }
}

export default function Command() {
  const { data, isLoading, revalidate, error } = useCachedPromise(
    findSessions,
    [],
    {
      initialData: [] as AgentSession[],
    },
  );

  const sessions = data ?? [];

  if (error && isCliNotFound(error)) {
    return (
      <SetupGuide searchedPath={cliNotFoundPath(error)} onRetry={revalidate} />
    );
  }

  const wrap = async (label: string, fn: () => Promise<void>) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: label,
    });
    try {
      await fn();
      toast.style = Toast.Style.Success;
      revalidate();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.message = (e as Error).message;
    }
  };

  const confirmDestructive = (
    title: string,
    message: string | undefined,
    primary: string,
  ) =>
    confirmAlert({
      title,
      message,
      primaryAction: { title: primary, style: Alert.ActionStyle.Destructive },
    });

  const renderActions = (s: AgentSession, r: PortRow) => (
    <ActionPanel>
      <ActionPanel.Section title={`pid ${r.pid}`}>
        {r.caffeinated ? (
          <Action
            title="Release This Pid"
            icon={Icon.BoltDisabled}
            onAction={() =>
              wrap(`Releasing pid ${r.pid}`, () => uncaffeinate(r.pid))
            }
          />
        ) : (
          <Action
            title="Caffeinate This Pid"
            icon={{ source: Icon.Bolt, tintColor: Color.Yellow }}
            onAction={() =>
              wrap(`Caffeinating pid ${r.pid}`, () => caffeinate(r.pid))
            }
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section
        title={`Session — ${s.provider} (${s.pids.length} procs)`}
      >
        {!s.allCaffeinated && (
          <Action
            title={
              s.anyCaffeinated
                ? `Caffeinate Whole Session (${s.pids.length - s.caffeinatedPids.length} remaining)`
                : "Caffeinate Whole Session"
            }
            icon={{ source: Icon.Bolt, tintColor: Color.Yellow }}
            shortcut={{ modifiers: ["cmd"], key: "k" }}
            onAction={() =>
              wrap(`Caffeinating ${s.provider}`, () =>
                forEachPid(
                  s.pids.filter((p) => !s.caffeinatedPids.includes(p)),
                  caffeinate,
                ),
              )
            }
          />
        )}
        {s.anyCaffeinated && (
          <Action
            title={
              s.allCaffeinated
                ? "Release Whole Session"
                : `Release Whole Session (${s.caffeinatedPids.length} awake)`
            }
            icon={Icon.BoltDisabled}
            shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            onAction={() =>
              wrap(`Releasing ${s.provider}`, () =>
                forEachPid(s.caffeinatedPids, uncaffeinate),
              )
            }
          />
        )}
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={revalidate}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Process Control">
        <Action
          title="Pause Pid (Sigstop)"
          icon={Icon.Pause}
          shortcut={{ modifiers: ["cmd"], key: "." }}
          onAction={() => wrap(`Pausing pid ${r.pid}`, () => pausePid(r.pid))}
        />
        <Action
          title="Resume Pid (Sigcont)"
          icon={Icon.Play}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          onAction={() => wrap(`Resuming pid ${r.pid}`, () => resumePid(r.pid))}
        />
        <Action
          title="Kill Pid (Sigterm)"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            if (
              await confirmDestructive(
                `Kill pid ${r.pid}?`,
                r.fullCommand,
                "Kill",
              )
            )
              await wrap(`Killing pid ${r.pid}`, () => killPid(r.pid, false));
          }}
        />
        <Action
          title="Force Kill Pid (Sigkill)"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
          onAction={async () => {
            if (
              await confirmDestructive(
                `Force-kill pid ${r.pid}?`,
                "SIGKILL cannot be caught — unsaved work will be lost.",
                "Force Kill",
              )
            )
              await wrap(`Force-killing pid ${r.pid}`, () =>
                killPid(r.pid, true),
              );
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Pid" content={String(r.pid)} />
        <Action.CopyToClipboard
          title="Copy All Session Pids"
          content={s.pids.join(",")}
        />
        {(r.workspace ?? r.cwd) && (
          <Action.CopyToClipboard
            title="Copy Workspace"
            content={r.workspace ?? r.cwd ?? ""}
          />
        )}
        {r.fullCommand && (
          <Action.CopyToClipboard
            title="Copy Full Command"
            content={r.fullCommand}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by provider, workspace, PID, or parent…"
    >
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Ports CLI not reachable"
          description={String(error.message ?? error)}
        />
      )}
      {!error && sessions.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No AI sessions detected"
          description="codex, claude, gemini, cursor — none currently running with a real workspace."
        />
      )}
      {sessions.map((s) => (
        <List.Section key={s.key} title={sectionTitle(s)}>
          {s.rows.map((r) => (
            <List.Item
              key={r.pid}
              icon={{
                source: r.caffeinated ? Icon.Bolt : Icon.Circle,
                tintColor: r.caffeinated ? Color.Yellow : Color.SecondaryText,
              }}
              title={`pid ${r.pid}`}
              subtitle={r.fullCommand?.split(" ")[0]}
              accessories={rowAccessories(r)}
              keywords={[
                String(r.pid),
                r.command,
                r.parentCommand ?? "",
                r.workspace ?? "",
                r.cwd ?? "",
                s.provider,
              ].filter(Boolean)}
              actions={renderActions(s, r)}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
