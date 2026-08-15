import { showFailureToast, usePromise } from "@raycast/utils";
import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  Form,
  useNavigation,
  confirmAlert,
  Clipboard,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getRelativeTime } from "./utils";
import { FormValidation, useForm } from "@raycast/utils";
import useNoteStore from "./stores/note-store";
import { debounce } from "lodash";
import { Note, NoteComment } from "./types";
import { NoteForm, NoteFormValues } from "./components/note-form";

export default function Command() {
  const { fetchNotes, deleteNote } = useNoteStore();
  const notes = useNoteStore((state) => state.notes);
  const onDeleteNote = useCallback(
    async (noteId: string) => {
      try {
        showToast({
          style: Toast.Style.Animated,
          title: "Deleting the note...",
        });
        await deleteNote(noteId);
        showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: "Note deleted",
        });
      } catch (err: unknown) {
        showFailureToast(err, {
          title: "Failed to delete note, please check your API key, API endpoint and try again.",
        });
      }
    },
    [deleteNote],
  );

  const [searchText, setSearchText] = useState("");

  const { isLoading, pagination } = usePromise(
    (searchText: string) => async (options: { page: number }) => {
      const resp = await fetchNotes({ limit: 12, page: options.page + 1, keyword: searchText });
      return { data: resp.data, hasMore: resp.meta.hasMore };
    },
    [searchText],
  );

  const debouncedSetSearchText = useCallback(
    debounce((text: string) => {
      setSearchText(text);
    }, 800),
    [setSearchText],
  );

  useEffect(() => {
    return () => {
      debouncedSetSearchText.cancel();
    };
  }, [debouncedSetSearchText]);

  return (
    <List
      isShowingDetail={notes?.length > 0}
      onSearchTextChange={debouncedSetSearchText}
      pagination={pagination}
      navigationTitle="Search Notes"
      isLoading={isLoading}
    >
      {notes?.length === 0 ? (
        <List.EmptyView
          icon={Icon.MugSteam}
          title="No Notes Found"
          description="You don't have any notes yet. Why not add some?"
        ></List.EmptyView>
      ) : (
        notes?.map((note: Note) => {
          return (
            <List.Item
              key={note.id}
              title={note.content.substring(0, 50)}
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.Pencil} title="Edit" target={<NoteForm note={note} />} />
                  <Action.Push icon={Icon.PlusCircle} title="New Comment" target={<CommentForm note={note} />} />
                  {(note.comments?.length || 0) > 0 && (
                    <Action.Push
                      icon={Icon.Bubble}
                      title="Manage Comments"
                      target={<Comments comments={note.comments as NoteComment[]} />}
                    />
                  )}
                  <Action
                    icon={Icon.CopyClipboard}
                    title="Copy"
                    onAction={async () => {
                      await Clipboard.copy(note.content);
                      showToast({
                        style: Toast.Style.Success,
                        title: "Note copied",
                      });
                    }}
                  />
                  <Action.OpenInBrowser
                    icon={Icon.Globe}
                    title="Open in Browser"
                    url={`https://www.essay.ink/i/notes`}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Delete"
                    onAction={async () => {
                      if (await confirmAlert({ title: "Are you sure you want to delete this note" })) {
                        showToast({
                          style: Toast.Style.Animated,
                          title: "Deleting the note...",
                        });
                        onDeleteNote(note.id);
                      } else {
                        showToast({
                          style: Toast.Style.Success,
                          title: "Canceled",
                          message: "Note not deleted",
                        });
                      }
                    }}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={note.content}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Folder" text={note.folder?.name || "Uncategorized"} />
                      {(note.comments?.length || 0) > 0 && <List.Item.Detail.Metadata.Separator />}

                      {note.comments?.map((comment: NoteComment) => {
                        return (
                          <List.Item.Detail.Metadata.Label
                            key={comment.id}
                            title={getRelativeTime(comment.created_at.toString())}
                            text={comment.content}
                          />
                        );
                      })}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          );
        })
      )}
    </List>
  );
}

function CommentForm({ note }: { note: Note }) {
  const { pop } = useNavigation();
  const { createComment } = useNoteStore();
  const { handleSubmit } = useForm<NoteFormValues>({
    async onSubmit(values) {
      try {
        showToast({
          style: Toast.Style.Animated,
          title: "Saving the comment...",
        });
        await createComment({ noteId: note.id, content: values.content });
        showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: "Comment saved",
        });
        pop();
      } catch (err: unknown) {
        showFailureToast(err, {
          title: "Failed to add comment, please check your API key, API endpoint and try again.",
        });
      }
    },
    validation: {
      content: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Comment" />
    </Form>
  );
}

function Comments({ comments }: { comments: NoteComment[] }) {
  const [noteComments, setNoteComments] = useState(comments);
  const { deleteComment } = useNoteStore();
  const onDeleteComment = useCallback(
    async (commentId: number) => {
      try {
        showToast({
          style: Toast.Style.Animated,
          title: "Deleting the comment...",
        });
        await deleteComment(commentId);
        showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: "Comment deleted",
        });
        setNoteComments((prev) => prev.filter((c) => c.id !== commentId));
      } catch (err: unknown) {
        showFailureToast(err, {
          title: "Failed to delete comment, please check your API key, API endpoint and try again.",
        });
      }
    },
    [deleteComment],
  );
  return (
    <List>
      {noteComments.map((comment: NoteComment) => {
        return (
          <List.Item
            key={comment.id}
            title={comment.content}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Trash}
                  title="Delete"
                  onAction={() => onDeleteComment(comment.id)}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
