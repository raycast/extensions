import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { client, noteUrl, settings } from "../lib/config";
import { noteEmoji } from "../lib/note-icon";
import { Note } from "../lib/api";
import { previewMarkdown } from "../lib/presentation";
import { NoteForm } from "./note-form";

export function NoteDetail({ id, append = false }: { id: string; append?: boolean }) {
  const [note, setNote] = useState<Note>();
  const [error, setError] = useState("");
  const [revision, refresh] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setError("");
    setNote(undefined);
    client()
      .note(id, abort.signal)
      .then((data) => {
        if (!abort.signal.aborted) setNote(data);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [id, revision]);
  if (append && note?.can_write) return <NoteForm note={note} />;
  return (
    <Detail
      isLoading={!note && !error}
      navigationTitle={append ? "Append to Note" : "Note"}
      markdown={
        error ||
        (append && note && !note.can_write
          ? "> You can view this note, but do not have permission to append.\n\n"
          : "") +
          (note
            ? `# ${note.title.replace(/[\\`*_{}[\]()#+.!<>~-]/g, "\\$&").replace(/\n/g, " ")}\n\n${previewMarkdown(note.body || "_This note is empty._")}`
            : "")
      }
      actions={
        <ActionPanel>
          {error && <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => refresh((n) => n + 1)} />}
          {note && (
            <>
              <Action.OpenInBrowser title="Open in Prismical" url={noteUrl(id)} />
              <Action.CopyToClipboard title="Copy Markdown" content={note.body || ""} />
              <Action.CopyToClipboard title="Copy Link" content={noteUrl(id)} />
              {note.can_write && (
                <Action.Push
                  title="Append to Note"
                  icon={Icon.Pencil}
                  target={<NoteForm note={note} />}
                  onPop={() => {
                    setNote(undefined);
                    setError("");
                    refresh((n) => n + 1);
                  }}
                />
              )}
              <Action.Push title="View Transcript" icon={Icon.Microphone} target={<Transcript id={id} />} />
            </>
          )}
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
function Transcript({ id }: { id: string }) {
  const [markdown, setMarkdown] = useState<string>();
  const [error, setError] = useState("");
  const [revision, refresh] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setMarkdown(undefined);
    setError("");
    client()
      .transcript(id, abort.signal)
      .then((data) => {
        if (!abort.signal.aborted)
          setMarkdown(
            (data.truncated ? "> Some recordings are omitted. Open Prismical to see the rest.\n\n" : "") +
              (data.results
                .map((r) => `## ${new Date(r.created_at).toLocaleString()}\n\n${r.text}`)
                .join("\n\n---\n\n") || "No transcript yet."),
          );
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [id, revision]);
  return (
    <Detail
      navigationTitle="Transcript"
      isLoading={markdown === undefined && !error}
      markdown={error || previewMarkdown(markdown || "")}
      actions={
        <ActionPanel>
          {error && <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => refresh((n) => n + 1)} />}
          {markdown !== undefined && <Action.CopyToClipboard title="Copy Transcript" content={markdown} />}
          <Action.OpenInBrowser title="Open in Prismical" url={noteUrl(id)} />
        </ActionPanel>
      }
    />
  );
}
export function Notes({ append = false }: { append?: boolean }) {
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [next, setNext] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [revision, refresh] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const loadingMore = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    if (settings().apiKey)
      client()
        .me(abort.signal)
        .then((me) => setWorkspace(me.org.name))
        .catch(() => {});
    return () => abort.abort();
  }, []);
  useEffect(() => {
    const version = ++generation.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setNext(undefined);
    setError("");
    setLoading(true);
    loadingMore.current = false;
    const timer = setTimeout(
      () => {
        client()
          .notes(query, "", abort.signal)
          .then((page) => {
            if (version === generation.current) {
              setNotes(page.notes);
              setNext(page.next);
            }
          })
          .catch((e) => {
            if (!abort.signal.aborted) {
              setNotes([]);
              setError(e.message);
            }
          })
          .finally(() => {
            if (version === generation.current) setLoading(false);
          });
      },
      query ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query, revision]);
  async function loadMore() {
    if (!next || loadingMore.current || loading) return;
    loadingMore.current = true;
    const version = generation.current;
    setLoading(true);
    try {
      const page = await client().notes(query, next, controller.current?.signal);
      if (version === generation.current) {
        setNotes((old) => [...old, ...page.notes.filter((n) => !old.some((o) => o.id === n.id))]);
        setNext(page.next);
      }
    } catch (e) {
      if (version === generation.current)
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load more notes",
          message: e instanceof Error ? e.message : String(e),
        });
    } finally {
      if (version === generation.current) {
        loadingMore.current = false;
        setLoading(false);
      }
    }
  }
  return (
    <List
      searchBarPlaceholder="Search all notes…"
      onSearchTextChange={setQuery}
      filtering={false}
      isLoading={loading}
      pagination={{ pageSize: 30, hasMore: !!next, onLoadMore: loadMore }}
    >
      <List.EmptyView
        title={error ? "Could Not Load Notes" : loading ? "Loading Notes" : "No Notes Found"}
        description={
          error ||
          (loading
            ? ""
            : query.trim()
              ? "Try another search or create a note."
              : "Create a note to capture your next idea.")
        }
        actions={
          <ActionPanel>
            {error && <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => refresh((n) => n + 1)} />}
            <Action.Push
              title="Create Note"
              icon={Icon.Plus}
              target={<NoteForm initialTitle={query} />}
              onPop={() => refresh((n) => n + 1)}
            />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
      <List.Section title={[workspace, query.trim() ? "Search Results" : "Recent Notes"].filter(Boolean).join(" · ")}>
        {notes.map((note) => (
          <List.Item
            key={note.id}
            title={note.title || "Untitled Note"}
            icon={noteEmoji(note.icon_url) || Icon.Document}
            subtitle={note.folder_name || undefined}
            accessories={[{ date: new Date(note.updated_at) }]}
            actions={
              <ActionPanel>
                {append ? (
                  <Action.Push
                    title="Choose Note"
                    icon={Icon.Pencil}
                    target={<NoteDetail id={note.id} append />}
                    onPop={() => refresh((n) => n + 1)}
                  />
                ) : (
                  <>
                    <Action.Push
                      title="Preview Note"
                      icon={Icon.Document}
                      target={<NoteDetail id={note.id} />}
                      onPop={() => refresh((n) => n + 1)}
                    />
                    <Action.OpenInBrowser title="Open in Prismical" url={noteUrl(note.id)} />
                  </>
                )}
                <Action.CopyToClipboard title="Copy Link" content={noteUrl(note.id)} />
                {!append && (
                  <Action.Push
                    title="Append to Note"
                    icon={Icon.Pencil}
                    target={<NoteDetail id={note.id} append />}
                    onPop={() => refresh((n) => n + 1)}
                  />
                )}
                <Action.Push
                  title="Create Note"
                  icon={Icon.Plus}
                  target={<NoteForm initialTitle={query} />}
                  onPop={() => refresh((n) => n + 1)}
                />
                <Action
                  title="Refresh"
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  icon={Icon.ArrowClockwise}
                  onAction={() => refresh((n) => n + 1)}
                />
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
