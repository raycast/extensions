import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchProps,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useForm, withAccessToken } from "@raycast/utils";
import { useState } from "react";

import { useSearchPages } from "./hooks";
import { getPageIcon } from "./utils/notion";
import { NoteStyle, addNote, describeAddNoteError, getDateTitle } from "./utils/notion/notes";
import { notionService } from "./utils/notion/oauth";
import { urlForPreferredMethod, openPageUrl } from "./utils/openPage";

type AddNoteValues = {
  note: string;
  parentPage: string;
};

function pageUrl(pageId: string) {
  return `https://www.notion.so/${pageId.replace(/-/g, "")}`;
}

function AddNote(props: LaunchProps<{ arguments: Arguments.AddNote }>) {
  const { notes_page_name, note_style, note_date_format, open_in } = getPreferenceValues<Preferences.AddNote>();

  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useSearchPages(searchText);
  const pages = data?.pages.filter((page) => page.object === "page");

  const { itemProps, handleSubmit, setValidationError } = useForm<AddNoteValues>({
    initialValues: {
      note: props.arguments.note ?? "",
    },
    async onSubmit(values) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Adding note" });

        const { datePageId, dateTitle } = await addNote({
          note: values.note.trim(),
          rootName: notes_page_name,
          dateFormat: note_date_format,
          style: note_style as NoteStyle,
          parentPageId: values.parentPage || undefined,
        });

        await closeMainWindow();
        await popToRoot();
        await showToast({
          style: Toast.Style.Success,
          title: "Note added",
          message: `${notes_page_name} › ${dateTitle}`,
          primaryAction: {
            title: "Open Page",
            onAction: () => openPageUrl(urlForPreferredMethod(pageUrl(datePageId), open_in), open_in),
          },
        });
      } catch (err) {
        const { title, message, field } = describeAddNoteError(err, notes_page_name);
        // Keep the reason on the field itself; the toast disappears before it can be read.
        if (field) setValidationError(field, message);
        await showToast({ style: Toast.Style.Failure, title, message });
      }
    },
    validation: {
      note: (value) => {
        if (!value?.trim()) return "Write your note first";
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add Note" icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.note}
        title="Note"
        placeholder="What's on your mind?"
        autoFocus={!props.arguments.note}
        enableMarkdown
      />

      <Form.Description title="Destination" text={`${notes_page_name} › ${getDateTitle(note_date_format)}`} />

      <Form.Dropdown
        {...itemProps.parentPage}
        title="Parent Page"
        info={`Only used the first time: Notion can't create top-level pages, so "${notes_page_name}" is created inside this page if it doesn't exist yet.`}
        onSearchTextChange={setSearchText}
        throttle
        storeValue
      >
        <Form.Dropdown.Item title={`None — "${notes_page_name}" already exists`} value="" icon={Icon.Minus} />
        {pages?.map((page) => (
          <Form.Dropdown.Item key={page.id} title={page.title ?? "Untitled"} value={page.id} icon={getPageIcon(page)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default withAccessToken(notionService)(AddNote);
