import { Form, ActionPanel, Action, showToast, useNavigation, Icon } from "@raycast/api";
import { useAtom } from "jotai";
import { notesAtom, tagsAtom } from "../services/atoms";
import CreateTag from "./createTag";
import { useEffect, useRef } from "react";
import { getTintColor } from "../utils/utils";
import { useForm } from "@raycast/utils";

type NoteForm = { title: string; note: string; tags: string[] };

const CreateEditNoteForm = ({
  createdAt,
  title,
  note,
  tags,
  isDraft = false,
}: {
  createdAt?: Date;
  title?: string;
  note?: string;
  tags?: string[];
  isDraft?: boolean;
}) => {
  const [notes, setNotes] = useAtom(notesAtom);
  const [tagStore] = useAtom(tagsAtom);
  const dataRef = useRef<NoteForm & { submittedForm: boolean }>({
    title: title ?? "",
    note: note ?? "",
    tags: tags ?? [],
    submittedForm: false,
  });
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, values } = useForm<NoteForm>({
    async onSubmit(values) {
      dataRef.current.submittedForm = true;
      const foundNote = notes.find((n) => n.createdAt === createdAt);
      if (foundNote) {
        const updatedNotes = notes.map((n) =>
          n.createdAt === createdAt
            ? {
                title: values.title,
                body: values.note,
                tags: values.tags,
                createdAt: n.createdAt,
                summary: n.summary,
                updatedAt: new Date(),
                is_draft: false,
              }
            : n,
        );
        await setNotes(updatedNotes);
      } else {
        await setNotes([
          ...notes,
          {
            title: values.title,
            body: values.note,
            tags: values.tags,
            createdAt: new Date(),
            updatedAt: new Date(),
            is_draft: false,
          },
        ]);
      }
      showToast({ title: "Note Saved" });
      pop();
    },
    initialValues: { note, title, tags },
    validation: {
      title: (value) => {
        if (!value) {
          return "Title is required";
        } else if (value.length > 100) {
          return "Title < 100 chars";
        } else if (notes.find((n) => n.title === value && n.createdAt !== createdAt)) {
          return "Title must be unique";
        }
      },
    },
  });

  // Keeps the dataRef.current in sync with the form values
  useEffect(() => {
    dataRef.current = {
      ...dataRef.current,
      title: values.title,
      note: values.note,
      tags: values.tags,
    };
  }, [values]);

  // This useEffect is a hack to autosave a draft on unmount when the form is not explicitly submitted by the user
  useEffect(() => {
    const autoSave = () => {
      const noteField = dataRef.current.note;
      const titleField = dataRef.current.title;
      const tagsField = dataRef.current.tags;

      // Don't autosave if form errors
      if (!titleField || titleField.length > 100) {
        return;
      }

      if (
        !dataRef.current.submittedForm &&
        ((noteField && noteField !== note) || (titleField && titleField !== title))
      ) {
        const noteExists = notes.find((n) => n.createdAt === createdAt);
        if (noteExists) {
          const updatedNotes = notes.map((n) => {
            if (n.createdAt === createdAt) {
              return {
                ...n,
                // Only update fields that have changed
                title: titleField !== title ? titleField : n.title,
                body: noteField !== note ? noteField : n.body,
                tags: tagsField ?? [],
                updatedAt: new Date(),
              };
            }
            return n;
          });
          setNotes(updatedNotes);
        } else if (!noteExists) {
          // For new notes
          setNotes([
            ...notes,
            {
              title: titleField ?? "",
              body: noteField ?? "",
              tags: tagsField ?? [],
              is_draft: isDraft,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]);
        }
      }
    };

    return autoSave;
  }, []);

  return (
    <Form
      navigationTitle={createdAt && !isDraft ? "Edit Note" : "Create Note"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={"Save Note"}
            icon={{ source: Icon.SaveDocument, tintColor: getTintColor("green") }}
            onSubmit={handleSubmit}
          />
          <Action.Push
            icon={{ source: Icon.Tag, tintColor: getTintColor("turquoise") }}
            target={<CreateTag />}
            title="Create Tag"
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={createdAt && !isDraft ? "Edit Note" : "Create New Note"} />
      <Form.TextField title="Title" placeholder="Note Title" {...itemProps.title} />
      <Form.TextArea title="Note" placeholder="Enter Markdown" enableMarkdown {...itemProps.note} />
      <Form.TagPicker title="Tags" info="⌘+⇧+T = new tag" {...itemProps.tags}>
        {tagStore.map((t, i) => (
          <Form.TagPicker.Item
            key={i}
            value={t.name}
            title={t.name}
            icon={{ source: "dot.png", tintColor: getTintColor(t.color) }}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
};

export default CreateEditNoteForm;
