import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Color,
  Icon,
  Keyboard,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { useInkdrop, STATUSES, TAG_COLOR_MAP, type DraftNote, type InkdropOption } from "./inkdrop";

interface CreateNoteValues {
  title: string;
  body: string;
  bookId: string;
  tags: string[];
  status: string;
}

const Command = () => {
  const { useBooks, useTags, saveNote } = useInkdrop(getPreferenceValues<InkdropOption>());
  const { books, isLoading: isBooksLoading } = useBooks();
  const { tags, isLoading: isTagsLoading } = useTags();

  const { handleSubmit, itemProps } = useForm<CreateNoteValues>({
    async onSubmit(values) {
      const note: DraftNote = {
        doctype: "markdown",
        share: "private",
        title: values.title,
        body: values.body,
        bookId: values.bookId as `book:${string}`,
        status: values.status as DraftNote["status"],
        tags: values.tags as `tag:${string}`[],
      };
      try {
        const result = await saveNote(note);
        const noteUri = `inkdrop://note/${result.id.substring(5)}`;
        await showToast({
          style: Toast.Style.Success,
          title: "Saved new note",
          primaryAction: {
            title: "Open in Inkdrop",
            shortcut: Keyboard.Shortcut.Common.Open,
            onAction: (toast) => {
              open(noteUri);
              toast.hide();
            },
          },
        });
        popToRoot();
      } catch (err) {
        await showFailureToast(err, { title: "Failed to save new note" });
      }
    },
    initialValues: {
      bookId: "",
      status: "none",
    },
    validation: {
      title: FormValidation.Required,
      bookId: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isBooksLoading || isTagsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Note title" autoFocus {...itemProps.title} />

      <Form.TextArea title="Body" placeholder="Note content (Markdown supported)" enableMarkdown {...itemProps.body} />

      <Form.Dropdown title="Notebook" {...itemProps.bookId}>
        <Form.Dropdown.Item key="placeholder" value="" title="Select a notebook" />
        {books?.map((book) => {
          return <Form.Dropdown.Item key={book._id} value={book._id} title={book.name} />;
        })}
      </Form.Dropdown>

      <Form.TagPicker title="Tags" {...itemProps.tags}>
        {tags?.map((tag) => {
          return (
            <Form.TagPicker.Item
              key={tag._id}
              value={tag._id}
              title={tag.name}
              icon={{ source: Icon.Circle, tintColor: TAG_COLOR_MAP[tag.color] ?? Color.SecondaryText }}
            />
          );
        })}
      </Form.TagPicker>

      <Form.Dropdown title="Status" {...itemProps.status}>
        {STATUSES.map((status) => {
          return <Form.Dropdown.Item key={status._id} value={status._id} title={status.name} icon={status.icon} />;
        })}
      </Form.Dropdown>
    </Form>
  );
};

export default Command;
