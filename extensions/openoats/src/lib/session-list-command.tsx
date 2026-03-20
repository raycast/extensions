import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Color,
  Icon,
  List,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import path from "node:path";

import { openOpenOatsUrl } from "./openoats-app";
import {
  buildSessionMarkdown,
  exportNotes,
  exportTranscript,
  formatTranscript,
  listSessions,
  loadSessionDetails,
  makeSessionUrl,
  type SessionDetails,
  type SessionSummary,
} from "./openoats";

type Mode = "browse" | "exportNotes" | "exportTranscripts";

export function SessionListCommand({ mode }: { mode: Mode }) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSessionID, setSelectedSessionID] = useState<string>();
  const [selectedDetails, setSelectedDetails] = useState<SessionDetails>();
  const [selectedSessionIDs, setSelectedSessionIDs] = useState<Set<string>>(new Set());

  useEffect(() => {
    void loadAllSessions();
  }, []);

  useEffect(() => {
    if (!selectedSessionID) {
      setSelectedDetails(undefined);
      return;
    }

    void loadSelectedSession(selectedSessionID);
  }, [selectedSessionID]);

  const visibleSessions = useMemo(() => {
    if (mode === "exportNotes") {
      return sessions.filter((session) => session.hasNotes);
    }

    return sessions;
  }, [mode, sessions]);

  const emptyTitle = mode === "exportNotes" ? "No Notes Found" : "No Sessions Found";
  const emptyDescription = mode === "exportNotes"
    ? "OpenOats has not generated any notes yet."
    : "Start a session in OpenOats and it will show up here.";
  const isExportMode = mode !== "browse";
  const selectionCount = selectedSessionIDs.size;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSelectionChange={(id) => setSelectedSessionID(id ?? undefined)}
      searchBarPlaceholder="Search OpenOats sessions"
      actions={
        isExportMode ? (
          <ActionPanel>
            {selectionCount > 0 ? (
              <Action
                title={mode === "exportNotes" ? `Export ${selectionCount} Notes` : `Export ${selectionCount} Transcripts`}
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={() => void exportSelectedSessions(mode, visibleSessions, selectedSessionIDs, setSelectedSessionIDs)}
              />
            ) : null}
            <Action
              title={mode === "exportNotes" ? `Export All ${visibleSessions.length} Notes` : `Export All ${visibleSessions.length} Transcripts`}
              icon={Icon.ArrowDown}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              onAction={() =>
                void exportSelectedSessions(
                  mode,
                  visibleSessions,
                  new Set(visibleSessions.map((session) => session.id)),
                  setSelectedSessionIDs,
                )
              }
            />
            <Action
              title={
                selectionCount > 0 ? `Clear Selection (${selectionCount})` : `Select All (${visibleSessions.length})`
              }
              icon={selectionCount > 0 ? Icon.XMarkCircle : Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={() => {
                if (selectionCount > 0) {
                  setSelectedSessionIDs(new Set());
                } else {
                  setSelectedSessionIDs(new Set(visibleSessions.map((session) => session.id)));
                }
              }}
            />
          </ActionPanel>
        ) : undefined
      }
    >
      {visibleSessions.map((session) => (
        <List.Item
          key={session.id}
          id={session.id}
          title={session.title}
          icon={
            isExportMode
              ? {
                  source: selectedSessionIDs.has(session.id) ? Icon.CheckCircle : Icon.Circle,
                  tintColor: selectedSessionIDs.has(session.id) ? Color.Green : Color.SecondaryText,
                }
              : undefined
          }
          subtitle={formatSessionSubtitle(session)}
          accessories={[
            session.hasNotes
              ? { icon: { source: Icon.Document, tintColor: Color.Green }, tooltip: "Generated notes available" }
              : { icon: { source: Icon.TextDocument, tintColor: Color.SecondaryText }, tooltip: "Transcript only" },
            { text: `${session.utteranceCount} utt.` },
          ]}
          detail={
            selectedSessionID === session.id
              ? <List.Item.Detail markdown={buildSessionMarkdown(session, selectedDetails)} />
              : undefined
          }
          keywords={session.searchText.split(/\s+/).filter(Boolean)}
          actions={
            <SessionActions
              mode={mode}
              session={session}
              details={selectedDetails}
              selectedSessionIDs={selectedSessionIDs}
              visibleSessions={visibleSessions}
              onToggleSelection={(sessionID) => {
                setSelectedSessionIDs((current) => {
                  const next = new Set(current);
                  if (next.has(sessionID)) {
                    next.delete(sessionID);
                  } else {
                    next.add(sessionID);
                  }
                  return next;
                });
              }}
              onClearSelection={() => setSelectedSessionIDs(new Set())}
              onSelectAll={() => setSelectedSessionIDs(new Set(visibleSessions.map((item) => item.id)))}
            />
          }
        />
      ))}
      {!visibleSessions.length && !isLoading ? (
        <List.EmptyView
          icon={Icon.MicrophoneDisabled}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : null}
    </List>
  );

  async function loadAllSessions() {
    try {
      const loaded = await listSessions();
      setSessions(loaded);
      setSelectedSessionID((current) => current ?? loaded[0]?.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load sessions.";
      await showToast({ style: Toast.Style.Failure, title: "OpenOats sessions unavailable", message });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSelectedSession(sessionID: string) {
    try {
      const details = await loadSessionDetails(sessionID);
      setSelectedDetails(details);
    } catch {
      setSelectedDetails(undefined);
    }
  }
}

function SessionActions({
  mode,
  session,
  details,
  selectedSessionIDs,
  visibleSessions,
  onToggleSelection,
  onClearSelection,
  onSelectAll,
}: {
  mode: Mode;
  session: SessionSummary;
  details?: SessionDetails;
  selectedSessionIDs: Set<string>;
  visibleSessions: SessionSummary[];
  onToggleSelection: (sessionID: string) => void;
  onClearSelection: () => void;
  onSelectAll: () => void;
}) {
  const transcriptText = details?.transcript?.length ? formatTranscript(details.transcript) : undefined;
  const isSelected = selectedSessionIDs.has(session.id);
  const isExportMode = mode !== "browse";

  return (
    <ActionPanel>
      {isExportMode ? (
        <>
          <Action
            title={isSelected ? "Deselect Session" : "Select Session"}
            icon={isSelected ? Icon.XMarkCircle : Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={() => onToggleSelection(session.id)}
          />
          <Action
            title={selectedSessionIDs.size > 0 ? `Export ${selectedSessionIDs.size} Selected` : "Export This Session"}
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() =>
              void exportSelectedSessions(
                mode,
                visibleSessions,
                selectedSessionIDs.size > 0 ? selectedSessionIDs : new Set([session.id]),
              )
            }
          />
          <Action
            title={`Export All ${visibleSessions.length}`}
            icon={Icon.ArrowDown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            onAction={() => void exportSelectedSessions(mode, visibleSessions, new Set(visibleSessions.map((item) => item.id)))}
          />
          <Action
            title={selectedSessionIDs.size > 0 ? `Clear Selection (${selectedSessionIDs.size})` : `Select All (${visibleSessions.length})`}
            icon={selectedSessionIDs.size > 0 ? Icon.XMarkCircle : Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={() => {
              if (selectedSessionIDs.size > 0) {
                onClearSelection();
              } else {
                onSelectAll();
              }
            }}
          />
          <Action title="Open in OpenOats" icon={Icon.AppWindow} onAction={() => void openSession(session.id)} />
        </>
      ) : null}
      {mode === "browse" ? (
        <Action title="Open in OpenOats" icon={Icon.AppWindow} onAction={() => void openSession(session.id)} />
      ) : null}
      {mode === "exportTranscripts" ? (
        <Action title="Export Transcript" icon={Icon.Download} onAction={() => void handleExportTranscript(session)} />
      ) : null}
      {mode === "exportNotes" ? (
        <Action title="Export Notes" icon={Icon.Download} onAction={() => void handleExportNotes(session)} />
      ) : null}

      {mode === "browse" ? (
        <>
          <Action title="Export Transcript" icon={Icon.Download} onAction={() => void handleExportTranscript(session)} />
          <Action
            title="Export Notes"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            onAction={() => void handleExportNotes(session)}
          />
          <Action
            title="Copy Transcript"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "." }}
            onAction={() => void handleCopyTranscript(session, transcriptText)}
          />
          <Action
            title="Copy Notes"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={() => void handleCopyNotes(session, details?.notes?.markdown)}
          />
        </>
      ) : null}
    </ActionPanel>
  );
}

async function openSession(sessionID?: string) {
  await closeMainWindow();
  await openOpenOatsUrl(makeSessionUrl(sessionID));
}

async function handleCopyTranscript(session: SessionSummary, transcriptText?: string) {
  if (!transcriptText) {
    await showToast({ style: Toast.Style.Failure, title: "Transcript unavailable", message: session.title });
    return;
  }

  await Clipboard.copy(transcriptText);
  await showToast({ style: Toast.Style.Success, title: "Transcript copied", message: session.title });
}

async function handleCopyNotes(session: SessionSummary, notesMarkdown?: string) {
  if (!notesMarkdown) {
    await showToast({ style: Toast.Style.Failure, title: "No generated notes", message: session.title });
    return;
  }

  await Clipboard.copy(notesMarkdown);
  await showToast({ style: Toast.Style.Success, title: "Notes copied", message: session.title });
}

async function handleExportTranscript(session: SessionSummary) {
  try {
    const exportedPath = await exportTranscript(session);
    await showToast({ style: Toast.Style.Success, title: "Transcript exported", message: session.title });
    await showInFinder(exportedPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export transcript.";
    await showToast({ style: Toast.Style.Failure, title: "Transcript export failed", message });
  }
}

async function handleExportNotes(session: SessionSummary) {
  try {
    const exportedPath = await exportNotes(session);
    await showToast({ style: Toast.Style.Success, title: "Notes exported", message: session.title });
    await showInFinder(exportedPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export notes.";
    await showToast({ style: Toast.Style.Failure, title: "Notes export failed", message });
  }
}

function formatSessionSubtitle(session: SessionSummary) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(session.startedAt);
}

async function exportSelectedSessions(
  mode: Exclude<Mode, "browse">,
  visibleSessions: SessionSummary[],
  selectedSessionIDs: Set<string>,
  setSelectedSessionIDs?: (value: Set<string>) => void,
) {
  const selected = visibleSessions.filter((session) => selectedSessionIDs.has(session.id));
  if (!selected.length) {
    await showToast({ style: Toast.Style.Failure, title: "No sessions selected" });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: mode === "exportNotes" ? "Exporting notes" : "Exporting transcripts",
    message: `${selected.length} session${selected.length === 1 ? "" : "s"}`,
  });

  const exporter = mode === "exportNotes" ? exportNotes : exportTranscript;
  const successPaths: string[] = [];
  let failures = 0;

  for (const session of selected) {
    try {
      const exportedPath = await exporter(session);
      successPaths.push(exportedPath);
    } catch {
      failures += 1;
    }
  }

  if (!successPaths.length) {
    toast.style = Toast.Style.Failure;
    toast.title = mode === "exportNotes" ? "Notes export failed" : "Transcript export failed";
    toast.message = "No files were exported.";
    return;
  }

  toast.style = failures > 0 ? Toast.Style.Failure : Toast.Style.Success;
  toast.title = mode === "exportNotes" ? "Notes exported" : "Transcripts exported";
  toast.message = failures > 0 ? `${successPaths.length} succeeded, ${failures} failed` : `${successPaths.length} file(s) exported`;
  await showInFinder(path.dirname(successPaths[0]));
  setSelectedSessionIDs?.(new Set());
}
