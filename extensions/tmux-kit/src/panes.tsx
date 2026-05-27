import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  TmuxError,
  TmuxPane,
  breakPane,
  capturePane,
  clearMarkedPane,
  clearPaneHistory,
  killOtherPanes,
  killPane,
  killWindow,
  listPanes,
  markPane,
  newWindow,
  renameWindow,
  swapWithMarkedPane,
  switchToWindow,
} from "./lib/tmux";

export function PanesView({ session }: { session: string }) {
  const [panes, setPanes] = useState<TmuxPane[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPanes(session);
      setPanes(data);
      setError(null);
    } catch (e) {
      const msg = e instanceof TmuxError ? e.stderr || e.message : String(e);
      setError(msg);
      setPanes([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const groups = new Map<number, { name: string; panes: TmuxPane[] }>();
  for (const p of panes) {
    const existing = groups.get(p.windowIndex);
    if (existing) {
      existing.panes.push(p);
    } else {
      groups.set(p.windowIndex, { name: p.windowName, panes: [p] });
    }
  }
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a - b);

  return (
    <List
      isLoading={loading}
      navigationTitle={`Panes · ${session}`}
      searchBarPlaceholder="Search by command, path, PID…"
    >
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to list panes"
          description={error}
        />
      )}
      {!error && !loading && panes.length === 0 && (
        <List.EmptyView
          icon={Icon.AppWindow}
          title="No panes"
          description={`Session ${session} has no panes`}
        />
      )}
      {sortedGroups.map(([wi, group]) => (
        <List.Section
          key={wi}
          title={`window ${wi}${group.name ? `: ${group.name}` : ""}`}
          subtitle={`${group.panes.length} pane${group.panes.length === 1 ? "" : "s"}`}
        >
          {group.panes
            .sort((a, b) => a.index - b.index)
            .map((p) => (
              <PaneItem
                key={p.id}
                pane={p}
                session={session}
                hasMarkedElsewhere={panes.some(
                  (q) => q.marked && q.id !== p.id,
                )}
                onChange={refresh}
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

function PaneItem({
  pane,
  session,
  hasMarkedElsewhere,
  onChange,
}: {
  pane: TmuxPane;
  session: string;
  hasMarkedElsewhere: boolean;
  onChange: () => Promise<void>;
}) {
  const accessories: List.Item.Accessory[] = [];
  if (pane.marked) {
    accessories.push({
      tag: { value: "MARKED", color: Color.Purple },
    });
  }
  accessories.push(
    {
      tag: {
        value: `${pane.width}×${pane.height}`,
        color: Color.SecondaryText,
      },
    },
    { text: `PID ${pane.pid}` },
    { text: pane.id },
  );

  return (
    <List.Item
      title={pane.command || "(no command)"}
      subtitle={pane.path}
      icon={
        pane.active
          ? { source: Icon.Star, tintColor: Color.Yellow }
          : { source: Icon.AppWindow, tintColor: Color.SecondaryText }
      }
      keywords={[
        pane.command,
        pane.path,
        String(pane.pid),
        pane.id,
        ...(pane.marked ? ["marked"] : []),
      ]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Path" content={pane.path} />
            <Action.Push
              title="View Pane Content"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={
                <PaneDetail
                  paneId={pane.id}
                  command={pane.command}
                  onChange={onChange}
                />
              }
            />
            <Action
              title="Copy Pane Content"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => copyContent(pane.id, pane.command)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy Metadata">
            <Action.CopyToClipboard
              title="Copy PID"
              content={String(pane.pid)}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
            <Action.CopyToClipboard
              title="Copy Pane ID"
              content={pane.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            />
            <Action.CopyToClipboard
              title="Copy Command"
              content={pane.command}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Break to New Window"
              icon={Icon.NewDocument}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={async () => {
                try {
                  await breakPane(pane.id);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Broke ${pane.id} into new window`,
                  });
                  await onChange();
                } catch (e) {
                  await toastError("Break failed", e);
                }
              }}
            />
            {pane.marked ? (
              <Action
                title="Unmark Pane"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
                onAction={async () => {
                  try {
                    await clearMarkedPane();
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Unmarked",
                    });
                    await onChange();
                  } catch (e) {
                    await toastError("Unmark failed", e);
                  }
                }}
              />
            ) : (
              <Action
                title="Mark Pane"
                icon={Icon.Bookmark}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
                onAction={async () => {
                  try {
                    await markPane(pane.id);
                    await showToast({
                      style: Toast.Style.Success,
                      title: `Marked ${pane.id}`,
                    });
                    await onChange();
                  } catch (e) {
                    await toastError("Mark failed", e);
                  }
                }}
              />
            )}
            {hasMarkedElsewhere && !pane.marked && (
              <Action
                title="Swap with Marked Pane"
                icon={Icon.Switch}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                onAction={async () => {
                  try {
                    await swapWithMarkedPane(pane.id);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Swapped with marked pane",
                    });
                    await onChange();
                  } catch (e) {
                    await toastError("Swap failed", e);
                  }
                }}
              />
            )}
            <Action
              title="Clear Pane History"
              icon={Icon.Eraser}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
              onAction={async () => {
                try {
                  await clearPaneHistory(pane.id);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Cleared history of ${pane.id}`,
                  });
                } catch (e) {
                  await toastError("Clear history failed", e);
                }
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Window">
            <Action
              title="Switch to Window"
              icon={Icon.Window}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
              onAction={async () => {
                try {
                  await switchToWindow(session, pane.windowIndex);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Selected window ${pane.windowIndex}`,
                  });
                  await onChange();
                } catch (e) {
                  await toastError("Switch failed", e);
                }
              }}
            />
            <Action.Push
              title="Rename Window"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              target={
                <RenameWindowForm
                  session={session}
                  windowIndex={pane.windowIndex}
                  currentName={pane.windowName}
                  onDone={onChange}
                />
              }
            />
            <Action.Push
              title="New Window in This Session"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              target={<NewWindowForm session={session} onDone={onChange} />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Danger Zone">
            <Action
              title="Kill Pane"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                const ok = await confirmAlert({
                  title: `Kill pane ${pane.id}?`,
                  message: `Running: ${pane.command || "(none)"}  ·  PID ${pane.pid}`,
                  primaryAction: {
                    title: "Kill",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (!ok) return;
                try {
                  await killPane(pane.id);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Killed ${pane.id}`,
                  });
                  await onChange();
                } catch (e) {
                  await toastError("Kill failed", e);
                }
              }}
            />
            <Action
              title="Kill Other Panes in Window"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
              onAction={async () => {
                const ok = await confirmAlert({
                  title: `Kill other panes in window ${pane.windowIndex}?`,
                  message: `Keeps ${pane.id} (${pane.command || "no command"}). All other panes in this window will be terminated.`,
                  primaryAction: {
                    title: "Kill Others",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (!ok) return;
                try {
                  await killOtherPanes(pane.id);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Kept ${pane.id}, killed others`,
                  });
                  await onChange();
                } catch (e) {
                  await toastError("Kill others failed", e);
                }
              }}
            />
            <Action
              title="Kill Window"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "w" }}
              onAction={async () => {
                const label = pane.windowName
                  ? `${pane.windowIndex}: ${pane.windowName}`
                  : `${pane.windowIndex}`;
                const ok = await confirmAlert({
                  title: `Kill window ${label}?`,
                  message: `All panes in this window will be terminated.`,
                  primaryAction: {
                    title: "Kill Window",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (!ok) return;
                try {
                  await killWindow(session, pane.windowIndex);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Killed window ${label}`,
                  });
                  await onChange();
                } catch (e) {
                  await toastError("Kill window failed", e);
                }
              }}
            />
          </ActionPanel.Section>

          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onChange}
          />
        </ActionPanel>
      }
    />
  );
}

function PaneDetail({
  paneId,
  command,
  onChange,
}: {
  paneId: string;
  command: string;
  onChange: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const text = await capturePane(paneId);
      setContent(text);
      setError(null);
    } catch (e) {
      setError(e instanceof TmuxError ? e.stderr || e.message : String(e));
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [paneId]);

  useEffect(() => {
    void load();
  }, [load]);

  const markdown = error
    ? `## Failed to capture pane\n\n\`\`\`\n${error}\n\`\`\``
    : `\`\`\`\n${content ?? ""}\n\`\`\``;

  return (
    <Detail
      isLoading={loading}
      navigationTitle={`Pane ${paneId} · ${command || "(no command)"}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          {content != null && !error && (
            <Action.CopyToClipboard title="Copy Content" content={content} />
          )}
          <Action
            title="Reload Capture"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={load}
          />
          <Action
            title="Kill Pane"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              const ok = await confirmAlert({
                title: `Kill pane ${paneId}?`,
                message: `Running: ${command || "(none)"}`,
                primaryAction: {
                  title: "Kill",
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (!ok) return;
              try {
                await killPane(paneId);
                await showToast({
                  style: Toast.Style.Success,
                  title: `Killed ${paneId}`,
                });
                await onChange();
                pop();
              } catch (e) {
                await toastError("Kill failed", e);
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}

async function copyContent(paneId: string, command: string): Promise<void> {
  try {
    const text = await capturePane(paneId);
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: `Copied content of ${paneId}`,
      message: command || undefined,
    });
  } catch (e) {
    await toastError("Capture failed", e);
  }
}

async function toastError(title: string, e: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: e instanceof TmuxError ? e.stderr || e.message : String(e),
  });
}

function RenameWindowForm({
  session,
  windowIndex,
  currentName,
  onDone,
}: {
  session: string;
  windowIndex: number;
  currentName: string;
  onDone: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      return;
    }
    try {
      await renameWindow(session, windowIndex, trimmed);
      await showToast({
        style: Toast.Style.Success,
        title: `Renamed window ${windowIndex} → ${trimmed}`,
      });
      await onDone();
      pop();
    } catch (e) {
      await toastError("Rename failed", e);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            icon={Icon.Pencil}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="New name"
        value={name}
        onChange={(v) => {
          setName(v);
          setError(undefined);
        }}
        error={error}
        autoFocus
      />
      <Form.Description
        text={`Renaming window ${windowIndex} in session "${session}"`}
      />
    </Form>
  );
}

function NewWindowForm({
  session,
  onDone,
}: {
  session: string;
  onDone: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [cwd, setCwd] = useState<string[]>([]);

  const submit = async () => {
    try {
      await newWindow(
        session,
        name.trim() || undefined,
        cwd[0]?.trim() || undefined,
      );
      await showToast({
        style: Toast.Style.Success,
        title: name.trim()
          ? `Created window "${name.trim()}"`
          : "Created window",
      });
      await onDone();
      pop();
    } catch (e) {
      await toastError("Create window failed", e);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create"
            icon={Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Window name"
        placeholder="Leave blank to auto-name from running command"
        value={name}
        onChange={setName}
        autoFocus
      />
      <Form.FilePicker
        id="cwd"
        title="Start directory"
        value={cwd}
        onChange={setCwd}
        canChooseFiles={false}
        canChooseDirectories={true}
        allowMultipleSelection={false}
        showHiddenFiles={false}
      />
      <Form.Description
        text={`Creating a new window in session "${session}". The new window is created detached (-d) so the session's current window does not change; use Switch to Window afterwards if you want to land on it.`}
      />
    </Form>
  );
}
