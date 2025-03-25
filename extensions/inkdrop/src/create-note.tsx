import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast, useNavigation } from "@raycast/api";
import { getInkdrop, type DraftNote, type InkdropOption } from "./inkdrop";

const Command = () => {
  const { pop } = useNavigation();
  const { useBooks, useTags, useStatuses, saveNote } = getInkdrop(getPreferenceValues<InkdropOption>());
  const { books, isLoading: isBooksLoading, error: booksError } = useBooks();
  const { tags, isLoading: isTagsLoading, error: tagsError } = useTags();
  const { statuses, isLoading: isStatusesLoading, error: statusesError } = useStatuses();

  if (booksError || tagsError || statusesError) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot access Inkdrop",
      message: "Check configuration of this extension and Inkdrop app",
    });
  }

  return (
    <Form
      isLoading={isBooksLoading || isTagsLoading || isStatusesLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Note"
            onSubmit={(values) =>
              saveNote({ doctype: "markdown", share: "private", ...values } as DraftNote)
                .then(() => {
                  showToast({
                    style: Toast.Style.Success,
                    title: "Saved new note",
                  });
                  pop();
                })
                .catch(() => {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to save new note",
                    message: "Check configuration of this extension and Inkdrop app",
                  });
                })
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" id="title" autoFocus />

      <Form.TextArea title="Body" id="body" enableMarkdown />

      <Form.Dropdown title="Notebook" id="bookId">
        {books?.map((book) => {
          return <Form.Dropdown.Item key={book._id} value={book._id} title={book.name} />;
        })}
      </Form.Dropdown>

      <Form.TagPicker title="Tags" id="tags">
        {tags?.map((tag) => {
          return <Form.TagPicker.Item key={tag._id} value={tag._id} title={tag.name} />;
        })}
      </Form.TagPicker>

      <Form.Dropdown title="Status" id="status" defaultValue="none">
        {statuses.map((status) => {
          return <Form.Dropdown.Item key={status._id} value={status._id} title={status.name} />;
        })}
      </Form.Dropdown>
    </Form>
  );
};

export default Command;
