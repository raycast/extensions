import {
  Action,
  ActionPanel,
  Color,
  Detail,
  environment,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  List,
  open,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { ERROR_IN_VIEW, LancettaMissingView, OpenLancettaAction, RefreshAction } from "./lib/actions";
import { DetailNumberRow } from "./lib/metadata";
import { folderName, formatDate, formatSpan, isMissing, isStale, nowSeconds } from "./lib/snapshot";
import {
  agentOf,
  changedAt,
  Column,
  columnOf,
  commandLine,
  loadWall,
  Note,
  openCommand,
  sessionsIn,
  titleOf,
  writeOpenScript,
} from "./lib/sessions";

const STATUS: Record<string, { icon: Image.ImageLike; label: string }> = {
  working: { icon: { source: Icon.CircleProgress50, tintColor: Color.Blue }, label: "Working" },
  asking: { icon: { source: Icon.QuestionMarkCircle, tintColor: Color.Orange }, label: "Asking you" },
  finished: { icon: { source: Icon.CheckCircle, tintColor: Color.Green }, label: "Finished its turn" },
  failed: { icon: { source: Icon.XMarkCircle, tintColor: Color.Red }, label: "Failed" },
  stopped: { icon: { source: Icon.Stop, tintColor: Color.SecondaryText }, label: "Stopped" },
  ended: { icon: { source: Icon.Circle, tintColor: Color.SecondaryText }, label: "Closed" },
  removed: { icon: { source: Icon.Trash, tintColor: Color.SecondaryText }, label: "Removed" },
};
const statusOf = (note: Note) => STATUS[note.status] ?? { icon: Icon.Dot, label: note.status };

const COLUMNS: { column: Column; title: string }[] = [
  { column: "yourTurn", title: "Your Turn" },
  { column: "working", title: "Working" },
  { column: "done", title: "Done" },
];

/** How many done sessions are listed: the wall keeps every one, the list the latest. */
const DONE_LIMIT = 30;

export default function Command() {
  const { showDone, terminal } = getPreferenceValues<Preferences.Sessions>();
  const { data: wall, isLoading, error, revalidate } = usePromise(loadWall, [], ERROR_IN_VIEW);
  const [agent, setAgent] = useState("all");

  if (error) {
    return (
      <List>
        {isMissing(error) ? (
          <LancettaMissingView onRefresh={revalidate} />
        ) : (
          <List.EmptyView
            icon={Icon.ExclamationMark}
            title="Could Not Read Lancetta's Sessions"
            description={error.message}
            actions={
              <ActionPanel>
                <RefreshAction onRefresh={revalidate} />
              </ActionPanel>
            }
          />
        )}
      </List>
    );
  }

  const shown = (wall?.notes ?? []).filter((n) => agent === "all" || agentOf(n) === agent);
  const now = nowSeconds();
  // the wall is what Lancetta saw last: with the app quit, a session can have moved on since
  const stale = wall?.writtenAt != null && isStale(wall.writtenAt, now) ? wall.writtenAt : null;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter sessions by name or folder"
      searchBarAccessory={
        <List.Dropdown tooltip="Agent" value={agent} onChange={setAgent}>
          <List.Dropdown.Item title="All Agents" value="all" />
          <List.Dropdown.Item title="Claude" value="Claude" icon={Icon.Stars} />
          <List.Dropdown.Item title="Codex" value="Codex" icon={Icon.Code} />
        </List.Dropdown>
      }
    >
      {!isLoading && shown.filter((n) => columnOf(n) !== "done").length === 0 && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="Nothing Waiting on You"
          description="No Claude Code or Codex session is working or waiting. Lancetta lists them as it sees them."
          actions={
            <ActionPanel>
              <OpenLancettaAction />
              <RefreshAction onRefresh={revalidate} />
            </ActionPanel>
          }
        />
      )}
      {stale !== null && (
        <List.Section title="Lancetta">
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.Orange }}
            title="Not Running"
            subtitle={`Last looked ${formatSpan(now - stale)} ago: sessions may have moved on since`}
            actions={
              <ActionPanel>
                <OpenLancettaAction />
                <RefreshAction onRefresh={revalidate} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {COLUMNS.filter(({ column }) => column !== "done" || showDone).map(({ column, title }) => {
        const items = sessionsIn(shown, column, column === "done" ? DONE_LIMIT : undefined);
        return (
          <List.Section key={column} title={title} subtitle={items.length ? String(items.length) : undefined}>
            {items.map((note) => (
              <SessionItem key={note.id} note={note} terminal={terminal} onRefresh={revalidate} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function SessionItem(props: { note: Note; terminal?: { name: string; path: string }; onRefresh: () => void }) {
  const { note, terminal, onRefresh } = props;
  const status = statusOf(note);
  const opening = openCommand(note);
  const changed = changedAt(note);
  const folder = folderName(note.cwd);
  const title = titleOf(note);

  const openInTerminal = async () => {
    if (!opening) return;
    try {
      const script = await writeOpenScript(environment.supportPath, opening);
      await open(script, terminal?.path ?? "Terminal");
    } catch (e) {
      await showFailureToast(e, { title: "Could not open the session" });
    }
  };

  return (
    <List.Item
      icon={status.icon}
      title={title}
      subtitle={folder && folder !== title ? folder : undefined}
      keywords={[folder ?? "", note.cwd ?? "", note.status, agentOf(note)]}
      accessories={[
        { tag: { value: agentOf(note), color: agentOf(note) === "Codex" ? Color.Green : Color.Orange } },
        ...(changed
          ? [{ date: new Date(changed), tooltip: `${status.label} since ${formatDate(changed / 1000)}` }]
          : []),
      ]}
      actions={
        <ActionPanel>
          {opening && (
            <Action title={`Open in ${terminal?.name ?? "Terminal"}`} icon={Icon.Terminal} onAction={openInTerminal} />
          )}
          <Action.Push title="Show Details" icon={Icon.Sidebar} target={<SessionDetail note={note} />} />
          {opening && (
            <Action.CopyToClipboard
              title="Copy Open Command"
              content={commandLine(opening)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
          {note.cwd && (
            <>
              <Action.ShowInFinder title="Show Folder in Finder" path={note.cwd} />
              <Action.CopyToClipboard
                title="Copy Folder Path"
                content={note.cwd}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
            </>
          )}
          <OpenLancettaAction />
          <RefreshAction onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function SessionDetail(props: { note: Note }) {
  const { note } = props;
  const status = statusOf(note);
  const opening = openCommand(note);
  const date = (iso?: string) => (iso && Date.parse(iso) ? formatDate(Date.parse(iso) / 1000) : undefined);
  // dates, spans and ids as tags: Raycast 2 cuts them in a label (see `NumberRow`)
  const rows: [string, string | undefined][] = [
    ["Started", date(note.started)],
    ["In This State Since", date(note.since)],
    ["Worked", note.worked !== undefined ? formatSpan(note.worked) : undefined],
    ["Waited on You", note.waited !== undefined ? formatSpan(note.waited) : undefined],
    ["Done", date(note.doneAt)],
  ];
  const markdown = [
    `## ${titleOf(note)}`,
    note.cwd ? `\`${note.cwd}\`` : "",
    opening
      ? `\nOpens with:\n\n\`\`\`\n${commandLine(opening)}\n\`\`\``
      : note.listed && (note.kind === "interactive" || note.agent === "codex")
        ? "\nIt is open in its own terminal: switch to it there."
        : "\nNothing opens it from here any more.",
  ].join("\n");
  return (
    <Detail
      markdown={markdown}
      navigationTitle={titleOf(note)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={status.label} icon={status.icon} />
          <Detail.Metadata.Label title="Agent" text={agentOf(note)} />
          {note.kind && <Detail.Metadata.Label title="Kind" text={note.kind} />}
          {rows.map(([title, value]) => value && <DetailNumberRow key={title} title={title} value={value} />)}
          <Detail.Metadata.Separator />
          <DetailNumberRow title="Session" value={note.room ?? note.thread ?? note.conversation ?? note.id} />
        </Detail.Metadata>
      }
      actions={
        opening ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Open Command" content={commandLine(opening)} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
