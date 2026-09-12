/* eslint-disable @raycast/prefer-title-case -- action titles use acronyms/keys (CSV, Ctrl) */
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  showInFinder,
  useNavigation,
  Clipboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import {
  clearAllSessions,
  deleteSession,
  getSessions,
  renameSession,
  resumeSession,
  startSession,
  stopActiveSession,
} from "./lib/storage";
import { pendingSeconds, tick } from "./lib/tracker";
import { refreshMenuBar } from "./lib/menubar";
import { sessionCsvFilename, sessionToCsv } from "./lib/csv";
import { promptSaveLocation } from "./lib/dialog";
import { formatDateTime, formatHMS, sessionTotalSeconds, sortedSpaces, spaceName } from "./lib/format";
import { Session, TrackerStatus } from "./lib/types";

export default function Command() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [status, setStatus] = useState<TrackerStatus>("idle");
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  /** Read the current state. Never writes: the menu bar command owns tracking. */
  async function reload() {
    const result = await tick({ commit: false });
    const list = await getSessions();
    list.sort((a, b) => b.startedAt - a.startedAt);
    setStatus(result.status);
    setSessions(list);
    setLoading(false);
  }

  /** Reload after an action that changed a session, flushing pending time first. */
  async function commitAndReload() {
    await tick();
    await reload();
  }

  useEffect(() => {
    reload();
    // Re-read stored state every couple of seconds (each poll shells out to read the active space)…
    const poll = setInterval(reload, 2000);
    // …while a plain clock advances the active session's total every second in between.
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, []);

  return (
    <List isLoading={loading} isShowingDetail={sessions.length > 0}>
      <List.EmptyView
        icon={Icon.Clock}
        title="No sessions yet"
        description="Start one from the Space Tracker menu bar command."
        actions={
          <ActionPanel>
            <Action
              title="Start New Session"
              icon={Icon.Play}
              onAction={async () => {
                await startSession();
                await commitAndReload();
                await refreshMenuBar();
                await showToast({ style: Toast.Style.Success, title: "Session started" });
              }}
            />
          </ActionPanel>
        }
      />
      {sessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          status={status}
          now={now}
          anyActive={sessions.some((s) => s.isActive)}
          onChange={commitAndReload}
        />
      ))}
    </List>
  );
}

/**
 * Tag and detail wording for the active session's live state. Anything other
 * than "Active" explains why the total isn't moving — the tracker only records
 * the main display, so a space on another screen counts for nothing.
 */
function trackingState(session: Session, status: TrackerStatus): { label: string; detail: string; color: Color } {
  if (session.paused) return { label: "Paused", detail: "Paused", color: Color.Yellow };
  switch (status) {
    case "auto-paused":
      return { label: "Idle", detail: "Auto-paused after no activity", color: Color.Yellow };
    case "other-display":
      return {
        label: "Other display",
        detail: "Not recording — the focused space is on another display",
        color: Color.SecondaryText,
      };
    case "error":
      return { label: "Error", detail: "Could not read the current space", color: Color.Red };
    default:
      return { label: "Active", detail: "Recording", color: Color.Green };
  }
}

function SessionItem({
  session,
  status,
  now,
  anyActive,
  onChange,
}: {
  session: Session;
  status: TrackerStatus;
  now: number;
  anyActive: boolean;
  onChange: () => Promise<void>;
}) {
  // Add the stretch the tracker hasn't committed yet, so an active session counts up live.
  const total = sessionTotalSeconds(session) + pendingSeconds(session, status, now);
  const spaces = sortedSpaces(session);
  const state = session.isActive ? trackingState(session, status) : undefined;

  const accessories: List.Item.Accessory[] = [];
  if (state) accessories.push({ tag: { value: state.label, color: state.color } });
  accessories.push({ text: formatHMS(total) });

  return (
    <List.Item
      icon={session.isActive ? { source: Icon.CircleFilled, tintColor: state?.color } : Icon.Clock}
      title={session.name}
      subtitle={formatDateTime(session.startedAt)}
      accessories={accessories}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Started" text={formatDateTime(session.startedAt)} />
              <List.Item.Detail.Metadata.Label
                title="Stopped"
                text={session.stoppedAt ? formatDateTime(session.stoppedAt) : "In progress"}
              />
              <List.Item.Detail.Metadata.Label title="Total" text={formatHMS(total)} />
              {state && <List.Item.Detail.Metadata.Label title="State" text={state.detail} />}
              <List.Item.Detail.Metadata.Separator />
              {spaces.map((rec) => (
                <List.Item.Detail.Metadata.Label
                  key={rec.key}
                  title={spaceName(rec)}
                  text={`${formatHMS(rec.seconds)}  (${total > 0 ? ((rec.seconds / total) * 100).toFixed(0) : "0"}%)`}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Export to CSV"
              icon={Icon.Download}
              onAction={async () => {
                const path = await promptSaveLocation(sessionCsvFilename(session), join(homedir(), "Downloads"));
                if (!path) {
                  await showToast({ style: Toast.Style.Failure, title: "Export cancelled" });
                  return;
                }
                try {
                  writeFileSync(path, sessionToCsv(session), "utf8");
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Session exported",
                    message: path,
                    primaryAction: { title: "Show in Finder", onAction: () => showInFinder(path) },
                  });
                } catch (err) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Export failed",
                    message: String(err),
                  });
                }
              }}
            />
            <Action
              title="Copy CSV to Clipboard"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(sessionToCsv(session));
                await showToast({ style: Toast.Style.Success, title: "CSV copied to clipboard" });
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {session.isActive ? (
              <Action
                title="Stop Session"
                icon={Icon.Stop}
                onAction={async () => {
                  await stopActiveSession();
                  await onChange();
                  await refreshMenuBar();
                  await showToast({ style: Toast.Style.Success, title: "Session stopped" });
                }}
              />
            ) : (
              <Action
                title="Start New Session"
                icon={Icon.Play}
                onAction={async () => {
                  await startSession();
                  await onChange();
                  await refreshMenuBar();
                  await showToast({ style: Toast.Style.Success, title: "Session started" });
                }}
              />
            )}
            {!session.isActive && !anyActive && (
              <Action
                title="Resume Session"
                icon={Icon.ArrowClockwise}
                onAction={async () => {
                  const resumed = await resumeSession(session.id);
                  await onChange();
                  await refreshMenuBar();
                  if (resumed) {
                    await showToast({ style: Toast.Style.Success, title: "Session resumed" });
                  } else {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Could not resume",
                      message: "Another session is already recording.",
                    });
                  }
                }}
              />
            )}
            <RenameAction session={session} onChange={onChange} />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Delete Session"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                const ok = await confirmAlert({
                  title: "Delete session?",
                  message: `"${session.name}" will be permanently removed.`,
                  primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                });
                if (ok) {
                  await deleteSession(session.id);
                  await onChange();
                  await showToast({ style: Toast.Style.Success, title: "Session deleted" });
                }
              }}
            />
            <Action
              title="Clear All Sessions"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                const ok = await confirmAlert({
                  title: "Clear all sessions?",
                  message: "Every recorded session will be permanently deleted. This cannot be undone.",
                  primaryAction: { title: "Delete All", style: Alert.ActionStyle.Destructive },
                });
                if (ok) {
                  await clearAllSessions();
                  await onChange();
                  await showToast({ style: Toast.Style.Success, title: "All sessions cleared" });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function RenameAction({ session, onChange }: { session: Session; onChange: () => Promise<void> }) {
  return (
    <Action.Push
      title="Rename Session"
      icon={Icon.Pencil}
      target={<RenameForm session={session} onChange={onChange} />}
    />
  );
}

function RenameForm({ session, onChange }: { session: Session; onChange: () => Promise<void> }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={async (values: { name: string }) => {
              await renameSession(session.id, values.name);
              await onChange();
              await showToast({ style: Toast.Style.Success, title: "Renamed" });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Session Name" defaultValue={session.name} />
    </Form>
  );
}
