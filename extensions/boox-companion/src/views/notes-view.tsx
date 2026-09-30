import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { BooxClient } from "../api/boox-client";
import { ConnectionEmptyView } from "../components/connection-state";
import { usePaginatedQuery } from "../hooks/use-paginated-query";
import { backupNotes, downloadNote } from "../lib/download";
import { describeBooxError } from "../lib/errors";
import { formatDate } from "../lib/format";
import { BooxNote } from "../models/boox";

export function NotesView(props: { client: BooxClient; folderId?: string; title?: string }) {
  const query = usePaginatedQuery(`notes:${props.client.host}:${props.folderId ?? "root"}`, async (offset, limit) => {
    const page = await props.client.getNotes({ folderId: props.folderId, offset, limit });
    return { items: page.notes, hasMore: offset + page.notes.length < page.count };
  });
  return (
    <List
      isLoading={query.isLoading}
      navigationTitle={props.title || "BOOX Notes"}
      searchBarPlaceholder="Search notes"
      pagination={query.pagination}
    >
      {query.error ? <ConnectionEmptyView error={query.error} onRetry={query.revalidate} /> : null}
      {!query.isLoading && !query.error && !query.data.length ? (
        <List.EmptyView icon={Icon.Pencil} title="No Notes" />
      ) : null}
      {query.data.map((note) => (
        <List.Item
          key={note.id}
          icon={note.folder ? Icon.Folder : props.client.thumbnailUrl(note.coverPath) || Icon.Pencil}
          title={note.title}
          subtitle={note.folder ? "Folder" : `${note.pageCount} pages`}
          accessories={[{ text: formatDate(note.updatedAt) }, ...(note.encrypted ? [{ icon: Icon.Lock }] : [])]}
          actions={<NoteActions client={props.client} note={note} onChanged={query.revalidate} />}
        />
      ))}
    </List>
  );
}

function NoteActions(props: { client: BooxClient; note: BooxNote; onChanged: () => void }) {
  const { client, note } = props;
  if (note.folder) {
    return (
      <ActionPanel>
        <Action.Push
          title="Open Folder"
          icon={Icon.Folder}
          target={<NotesView client={client} folderId={note.id} title={note.title} />}
        />
      </ActionPanel>
    );
  }
  return (
    <ActionPanel>
      <Action title="Export PDF" icon={Icon.Download} onAction={() => downloadNote(client, note)} />
      <Action.Push title="Show Details" icon={Icon.Sidebar} target={<NoteDetail client={client} note={note} />} />
      <Action title="Back up All Notes" icon={Icon.Box} onAction={() => backupNotes(client)} />
      <Action
        title="Delete Note"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={async () => {
          const confirmed = await confirmAlert({
            title: `Delete ${note.title}?`,
            message: `${note.pageCount} pages will be removed from the BOOX.`,
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          });
          if (!confirmed) return;
          const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting Note" });
          try {
            await client.deleteNote(note);
            toast.style = Toast.Style.Success;
            toast.title = "Note Deleted";
            props.onChanged();
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Delete Failed";
            toast.message = describeBooxError(error);
          }
        }}
      />
    </ActionPanel>
  );
}

function NoteDetail(props: { client: BooxClient; note: BooxNote }) {
  const cover = props.client.thumbnailUrl(props.note.coverPath);
  return (
    <Detail
      markdown={`${cover ? `![${props.note.title}](${cover})\n\n` : ""}# ${props.note.title}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Pages" text={String(props.note.pageCount)} />
          <Detail.Metadata.Label title="Created" text={formatDate(props.note.createdAt)} />
          <Detail.Metadata.Label title="Updated" text={formatDate(props.note.updatedAt)} />
          <Detail.Metadata.Label title="Encrypted" text={props.note.encrypted ? "Yes" : "No"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Export PDF" icon={Icon.Download} onAction={() => downloadNote(props.client, props.note)} />
        </ActionPanel>
      }
    />
  );
}
