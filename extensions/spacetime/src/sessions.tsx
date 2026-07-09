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
  startSession,
  stopActiveSession,
} from "./lib/storage";
import { tick } from "./lib/tracker";
import { refreshMenuBar } from "./lib/menubar";
import { sessionCsvFilename, sessionToCsv } from "./lib/csv";
import { promptSaveLocation } from "./lib/dialog";
import { formatDuration, formatHMS, sessionTotalSeconds, sortedSpaces, spaceName } from "./lib/format";
import { Session } from "./lib/types";

export default function Command() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    // Flush elapsed time into the active session so its total is up to date here.
    await tick();
    const list = await getSessions();
    list.sort((a, b) => b.startedAt - a.startedAt);
    setSessions(list);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // Keep the active session's total live while the view is open.
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
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
                await reload();
                await refreshMenuBar();
                await showToast({ style: Toast.Style.Success, title: "Session started" });
              }}
            />
          </ActionPanel>
        }
      />
      {sessions.map((session) => (
        <SessionItem key={session.id} session={session} onChange={reload} />
      ))}
    </List>
  );
}

function SessionItem({ session, onChange }: { session: Session; onChange: () => Promise<void> }) {
  const total = sessionTotalSeconds(session);
  const spaces = sortedSpaces(session);

  const accessories: List.Item.Accessory[] = [];
  if (session.isActive) {
    accessories.push({
      tag: {
        value: session.paused ? "Paused" : "Active",
        color: session.paused ? Color.Yellow : Color.Green,
      },
    });
  }
  accessories.push({ text: formatDuration(total) });

  const markdown = buildDetailMarkdown(session);

  return (
    <List.Item
      icon={session.isActive ? { source: Icon.CircleFilled, tintColor: Color.Green } : Icon.Clock}
      title={session.name}
      subtitle={new Date(session.startedAt).toLocaleString()}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Started" text={new Date(session.startedAt).toLocaleString()} />
              <List.Item.Detail.Metadata.Label
                title="Stopped"
                text={session.stoppedAt ? new Date(session.stoppedAt).toLocaleString() : "In progress"}
              />
              <List.Item.Detail.Metadata.Label title="Total" text={formatHMS(total)} />
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

function buildDetailMarkdown(session: Session): string {
  const total = sessionTotalSeconds(session);
  const spaces = sortedSpaces(session);
  const lines: string[] = [];
  lines.push(`# ${session.name}`);
  lines.push("");
  lines.push(`**Total:** ${formatHMS(total)}`);
  lines.push("");
  if (spaces.length === 0) {
    lines.push("_No space time recorded yet._");
    return lines.join("\n");
  }
  lines.push("| Space | Time | Percentage |");
  lines.push("| --- | --- | --- |");
  for (const rec of spaces) {
    const pct = total > 0 ? rec.seconds / total : 0;
    lines.push(`| ${spaceName(rec)} | ${formatHMS(rec.seconds)} | ${(pct * 100).toFixed(1)}% |`);
  }
  return lines.join("\n");
}
