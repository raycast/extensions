// Search Notes and Open Note share one list: Search Notes searches as you
// type and shows a preview pane; Open Note lists recent notes and filters
// them in Raycast.

import { Action, ActionPanel, Icon, Keyboard, List, open } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { TaskForm } from "./add-task";
import { Notebook, notebookChoices } from "./capture-logic";
import { Gate, Session } from "./gate";
import { listNotebooks, readNote, searchNotes } from "./kanso";
import { env } from "./session";
import {
  FullNote,
  NoteRow,
  SEARCH_DEBOUNCE_MS,
  hasTasks,
  noteActions,
  noteRows,
  previewMarkdown,
  readBody,
  searchRequest,
  subtitleFor,
  updatedLabel,
} from "./search-logic";

export function SearchView({ live }: { live: boolean }) {
  return <Gate>{(session) => <Notes session={session} live={live} />}</Gate>;
}

function Notes({ session, live }: { session: Session; live: boolean }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [books, setBooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | undefined>();
  const [full, setFull] = useState<Record<string, FullNote>>({});
  const latest = useRef(0);

  useEffect(() => {
    void listNotebooks(env, session.port, session.key)
      .then((docs) => setBooks(notebookChoices(docs)))
      .catch((e) => session.reconnect(e));
  }, [session]);

  useEffect(() => {
    const ticket = ++latest.current;
    setLoading(true);
    const timer = setTimeout(
      () => {
        searchNotes(env, session.port, session.key, searchRequest(live ? query : ""))
          .then((docs) => {
            if (ticket !== latest.current) return;
            setRows(noteRows(docs));
            setFailed(undefined);
          })
          .catch(async (e) => {
            if (ticket !== latest.current) return;
            if (await session.reconnect(e)) return;
            setFailed(e instanceof Error ? e.message : String(e));
          })
          .finally(() => {
            if (ticket === latest.current) setLoading(false);
          });
      },
      live && query ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [query, live, session]);

  function load(id: string | null) {
    if (!id || full[id]) return;
    readNote(env, session.port, session.key, id)
      .then((doc) => {
        const read = readBody(doc);
        if (read) setFull((prev) => ({ ...prev, [id]: read }));
      })
      .catch((e) => session.reconnect(e));
  }

  return (
    <List
      isLoading={loading}
      isShowingDetail={live}
      filtering={!live}
      throttle
      searchBarPlaceholder={live ? "Search your notes" : "Open a note"}
      onSearchTextChange={live ? setQuery : undefined}
      onSelectionChange={live ? load : undefined}
    >
      {failed ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Couldn't reach Kanso" description={failed} />
      ) : (
        <List.EmptyView title={query ? "No notes match" : "No notes yet"} />
      )}
      {rows.map((row) => (
        <Row key={row.id} row={row} books={books} live={live} full={full[row.id]} session={session} />
      ))}
    </List>
  );
}

function Row(props: { row: NoteRow; books: Notebook[]; live: boolean; full: FullNote | undefined; session: Session }) {
  const { row, books, live, full, session } = props;
  const act = noteActions(row);
  const updated = updatedLabel(row.updatedAt);
  const book = subtitleFor(row, books);
  return (
    <List.Item
      id={row.id}
      title={row.title}
      subtitle={live ? undefined : book}
      icon={row.locked ? Icon.Lock : Icon.Document}
      accessories={updated ? [{ text: updated }] : []}
      detail={
        live ? (
          <List.Item.Detail
            markdown={previewMarkdown(row, full)}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Notebook" text={book || "Unknown"} />
                {updated && <List.Item.Detail.Metadata.Label title="Updated" text={updated} />}
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action title="Open in Kanso" icon={Icon.AppWindow} onAction={() => void open(act.open)} />
          <Action.CopyToClipboard
            title="Copy Link"
            content={act.link}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
          />
          <Action.CopyToClipboard title="Copy Title" content={act.title} shortcut={Keyboard.Shortcut.Common.Copy} />
          {hasTasks(row, full) && (
            <Action.Push
              title="Add Task Here"
              icon={Icon.Checkmark}
              target={<TaskForm session={session} note={{ id: row.id, title: row.title }} />}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
