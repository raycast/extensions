import { Action, ActionPanel, Form, Icon, Toast, open, popToRoot, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

import { createNote, getErrorMessage } from "./api/scratch";

type NoteFormValues = {
  title: string;
  folder: string;
  content: string;
};

export default function NewNoteCommand() {
  const { handleSubmit, itemProps } = useForm<NoteFormValues>({
    async onSubmit(values) {
      await submit(values, false);
    },
    validation: {
      title: FormValidation.Required,
    },
    initialValues: {
      title: "",
      folder: "",
      content: "",
    },
  });

  async function submit(values: NoteFormValues, openAfterCreate: boolean) {
    if (!values.title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating note",
    });

    try {
      const note = await createNote(values);
      toast.style = Toast.Style.Success;
      toast.title = "Note created";
      toast.message = note.title;

      if (openAfterCreate) {
        await open(note.path);
      }

      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create note";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Note" onSubmit={handleSubmit} />
          <Action.SubmitForm
            icon={Icon.Document}
            title="Create and Open Note"
            onSubmit={(values: NoteFormValues) => submit(values, true)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField autoFocus id="title" title="Title" placeholder="Weekly review" {...itemProps.title} />
      <Form.TextField
        id="folder"
        title="Folder"
        placeholder="Optional, for example journal/daily"
        {...itemProps.folder}
      />
      <Form.TextArea id="content" title="Content" placeholder="Optional note body" {...itemProps.content} />
    </Form>
  );
}
