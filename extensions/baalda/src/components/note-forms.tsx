import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { type ReactNode, useState } from "react";
import {
  appendNote,
  deleteNote,
  editNote,
  listFolders,
  moveNote,
  readNote,
  updateNote,
  ROOT_FOLDER,
  type Folder,
  type NoteContent,
  type NoteEdit,
} from "../lib/baalda";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function markdownFileName(value: string): string {
  const name = value.trim().replace(/^\/+/, "");
  if (!name) return "note.md";
  return /\.md$/i.test(name) ? name : `${name}.md`;
}

function NoteLoader({ docId, children }: { docId: string; children: (note: NoteContent) => ReactNode }) {
  const { data: note, isLoading } = useCachedPromise(readNote, [docId], {
    onError: (error) =>
      void showToast({
        style: Toast.Style.Failure,
        title: "Couldn't read note",
        message: errorMessage(error),
      }),
  });

  if (!note) {
    return <Detail isLoading={isLoading} markdown={isLoading ? "Loading note…" : "Note could not be loaded."} />;
  }

  return <>{children(note)}</>;
}

export function DeleteNoteAction({
  note,
  onDeleted,
  closeOnDelete = false,
}: {
  note: Pick<NoteContent, "docId" | "title">;
  onDeleted?: () => void;
  closeOnDelete?: boolean;
}) {
  const { pop } = useNavigation();

  return (
    <Action
      title="Delete Note"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: `Delete "${note.title ?? note.docId}"?`,
          message: "The note will be soft-deleted; its edit history will be preserved.",
          primaryAction: { title: "Delete Note", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;

        const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting note…" });
        try {
          await deleteNote(note.docId);
          toast.style = Toast.Style.Success;
          toast.title = "Note deleted";
          onDeleted?.();
          if (closeOnDelete) pop();
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Delete failed";
          toast.message = errorMessage(error);
        }
      }}
    />
  );
}

export function NoteDetailView({ docId, onChanged }: { docId: string; onChanged?: () => void }) {
  const {
    data: note,
    isLoading,
    revalidate,
  } = useCachedPromise(readNote, [docId], {
    onError: (error) =>
      void showToast({
        style: Toast.Style.Failure,
        title: "Couldn't read note",
        message: errorMessage(error),
      }),
  });

  if (!note) {
    return <Detail isLoading={isLoading} markdown={isLoading ? "Loading note…" : "Note could not be loaded."} />;
  }

  const refresh = () => {
    void revalidate();
    onChanged?.();
  };

  return (
    <Detail
      navigationTitle={note.title ?? "Note"}
      markdown={`# ${note.title ?? "Note"}\n\n${note.content}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Path" text={note.relPath ?? "Unknown"} />
          <Detail.Metadata.Label title="Doc ID" text={note.docId} />
          {note.revision && <Detail.Metadata.Label title="Revision" text={note.revision.slice(0, 12)} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Content" content={note.content} />
          <Action.Paste title="Paste into Active App" content={note.content} />
          <Action.Push
            title="Append to Note"
            icon={Icon.Plus}
            target={<AppendNoteView docId={docId} onDone={refresh} />}
          />
          <Action.Push
            title="Replace Note Content"
            icon={Icon.Pencil}
            target={<UpdateNoteView docId={docId} onDone={refresh} />}
          />
          <Action.Push
            title="Make Targeted Edit"
            icon={Icon.Wand}
            target={<EditNoteView docId={docId} onDone={refresh} />}
          />
          <Action.Push
            title="Move or Rename Note"
            icon={Icon.ArrowRight}
            target={<MoveNoteView docId={docId} onDone={refresh} />}
          />
          <DeleteNoteAction note={note} onDeleted={refresh} closeOnDelete />
        </ActionPanel>
      }
    />
  );
}

export function AppendNoteView({ docId, onDone }: { docId: string; onDone?: () => void }) {
  return <NoteLoader docId={docId}>{(note) => <AppendNoteForm note={note} onDone={onDone} />}</NoteLoader>;
}

function AppendNoteForm({ note, onDone }: { note: NoteContent; onDone?: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ text: string }>({
    validation: { text: FormValidation.Required },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Appending to note…" });
      try {
        await appendNote(note.docId, `\n${values.text.trim()}\n`, {
          expectedRevision: note.revision,
          idempotencyKey: crypto.randomUUID(),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Text appended";
        onDone?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Append failed";
        toast.message = errorMessage(error);
      }
    },
  });

  return (
    <Form
      navigationTitle={`Append to "${note.title ?? "note"}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Append to Note" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Markdown to append"
        placeholder="Text to add at the end of the note…"
        {...itemProps.text}
        autoFocus
      />
      <Form.Description
        text={
          note.revision
            ? "The current revision will be used to prevent stale writes."
            : "The note has no revision token."
        }
      />
    </Form>
  );
}

export function UpdateNoteView({ docId, onDone }: { docId: string; onDone?: () => void }) {
  return <NoteLoader docId={docId}>{(note) => <UpdateNoteForm note={note} onDone={onDone} />}</NoteLoader>;
}

function UpdateNoteForm({ note, onDone }: { note: NoteContent; onDone?: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ content: string }>({
    initialValues: { content: note.content },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating note…" });
      try {
        await updateNote({ docId: note.docId, content: values.content, expectedRevision: note.revision });
        toast.style = Toast.Style.Success;
        toast.title = "Note updated";
        onDone?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Update failed";
        toast.message = errorMessage(error);
      }
    },
  });

  return (
    <Form
      navigationTitle={`Replace "${note.title ?? "note"}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Replace Note Content" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Full markdown content" {...itemProps.content} autoFocus />
      <Form.Description
        text={
          note.revision
            ? "The current revision will be used to prevent stale writes."
            : "The note has no revision token."
        }
      />
    </Form>
  );
}

type EditKind = "replace" | "insert_before" | "insert_after" | "delete";

export function EditNoteView({ docId, onDone }: { docId: string; onDone?: () => void }) {
  return <NoteLoader docId={docId}>{(note) => <EditNoteForm note={note} onDone={onDone} />}</NoteLoader>;
}

function EditNoteForm({ note, onDone }: { note: NoteContent; onDone?: () => void }) {
  const { pop } = useNavigation();
  const [kind, setKind] = useState<EditKind>("replace");
  const { handleSubmit, itemProps } = useForm<{
    anchor: string;
    replacement: string;
    all: boolean;
  }>({
    initialValues: { anchor: "", replacement: "", all: false },
    validation: { anchor: FormValidation.Required },
    async onSubmit(values) {
      const edit: NoteEdit =
        kind === "replace"
          ? { type: "replace", find: values.anchor, replace: values.replacement, ...(values.all ? { all: true } : {}) }
          : kind === "delete"
            ? { type: "delete", find: values.anchor, ...(values.all ? { all: true } : {}) }
            : { type: kind, anchor: values.anchor, text: values.replacement };

      const toast = await showToast({ style: Toast.Style.Animated, title: "Editing note…" });
      try {
        await editNote({ docId: note.docId, edits: [edit], expectedRevision: note.revision });
        toast.style = Toast.Style.Success;
        toast.title = "Note edited";
        onDone?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Edit failed";
        toast.message = errorMessage(error);
      }
    },
  });

  const targetTitle = kind === "replace" || kind === "delete" ? "Exact text to find" : "Exact anchor text";
  const valueTitle =
    kind === "replace" ? "Replacement text" : kind === "delete" ? "Replacement text (unused)" : "Text to insert";

  return (
    <Form
      navigationTitle={`Edit "${note.title ?? "note"}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Edit" icon={Icon.Wand} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="edit-operation"
        title="Operation"
        value={kind}
        onChange={(value) => setKind(value as EditKind)}
      >
        <Form.Dropdown.Item title="Replace exact text" value="replace" />
        <Form.Dropdown.Item title="Insert before anchor" value="insert_before" />
        <Form.Dropdown.Item title="Insert after anchor" value="insert_after" />
        <Form.Dropdown.Item title="Delete exact text" value="delete" />
      </Form.Dropdown>
      <Form.TextArea
        title={targetTitle}
        placeholder="Matching is exact and case-sensitive…"
        {...itemProps.anchor}
        autoFocus
      />
      {kind !== "delete" && (
        <Form.TextArea
          title={valueTitle}
          placeholder="Text to insert or use as the replacement…"
          {...itemProps.replacement}
        />
      )}
      {kind === "delete" || kind === "replace" ? (
        <Form.Checkbox label="Apply to every matching occurrence" {...itemProps.all} />
      ) : null}
      <Form.Description
        text={`Only one targeted edit is submitted. Current revision: ${note.revision?.slice(0, 12) ?? "not available"}.`}
      />
    </Form>
  );
}

export function MoveNoteView({ docId, onDone }: { docId: string; onDone?: () => void }) {
  return <NoteLoader docId={docId}>{(note) => <MoveNoteForm note={note} onDone={onDone} />}</NoteLoader>;
}

function MoveNoteForm({ note, onDone }: { note: NoteContent; onDone?: () => void }) {
  const { pop } = useNavigation();
  const vaultId = note.vaultId ?? "";
  const { data: folders, isLoading: loadingFolders } = useCachedPromise(
    (id: string) => (id ? listFolders(id) : Promise.resolve([] as Folder[])),
    [vaultId],
    {
      onError: (error) =>
        void showToast({
          style: Toast.Style.Failure,
          title: "Couldn't load folders",
          message: errorMessage(error),
        }),
    },
  );
  const currentFolderId = note.folderId ?? ROOT_FOLDER;
  const [folderId, setFolderId] = useState(currentFolderId);
  const currentFileName = note.relPath?.split("/").pop() || "note.md";
  const { handleSubmit, itemProps } = useForm<{ fileName: string; title: string }>({
    initialValues: { fileName: currentFileName, title: note.title ?? "" },
    validation: { fileName: FormValidation.Required },
    async onSubmit(values) {
      const fileName = markdownFileName(values.fileName);
      if (!fileName) return;
      const selectedFolder = folders?.find((folder) => folder.folderId === folderId);
      const relPath = selectedFolder ? `${selectedFolder.path}/${fileName}` : fileName;
      const toast = await showToast({ style: Toast.Style.Animated, title: "Moving note…" });
      try {
        await moveNote({
          docId: note.docId,
          relPath,
          title: values.title.trim() || undefined,
          folderId: folderId === ROOT_FOLDER ? null : folderId,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Note moved";
        onDone?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Move failed";
        toast.message = errorMessage(error);
      }
    },
  });

  const currentFolderVisible =
    folderId === ROOT_FOLDER || (folders ?? []).some((folder) => folder.folderId === folderId);

  return (
    <Form
      isLoading={loadingFolders}
      navigationTitle={`Move "${note.title ?? "note"}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Move or Rename Note" icon={Icon.ArrowRight} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="File name" placeholder="note.md" {...itemProps.fileName} autoFocus />
      <Form.TextField title="Display title" placeholder="Optional title" {...itemProps.title} />
      <Form.Dropdown id="destination-folder" title="Destination folder" value={folderId} onChange={setFolderId}>
        <Form.Dropdown.Item title="Vault root" value={ROOT_FOLDER} />
        {!currentFolderVisible && <Form.Dropdown.Item title="Current folder (unavailable)" value={folderId} />}
        {(folders ?? []).map((folder) => (
          <Form.Dropdown.Item key={folder.folderId} title={folder.path} value={folder.folderId} />
        ))}
      </Form.Dropdown>
      <Form.Description text="The note keeps the same docId and edit history." />
    </Form>
  );
}
