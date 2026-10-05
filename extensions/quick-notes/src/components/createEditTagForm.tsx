import { Action, ActionPanel, Form, Icon, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useAtom } from "jotai";
import { notesAtom, Tag, tagsAtom } from "../services/atoms";
import { colors, getRandomColor, getTintColor } from "../utils/utils";

type TagFormValues = {
  name: string;
  color: string;
};

export default function CreateEditTagForm({ tag }: { tag?: Tag }) {
  const [tags, setTags] = useAtom(tagsAtom);
  const [notes, setNotes] = useAtom(notesAtom);
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<TagFormValues>({
    async onSubmit(values) {
      if (tag) {
        // Rename the tag across all notes before updating the tag store, so the
        // tagsAtom deleted-tag cleanup doesn't strip the tag from notes
        if (tag.name !== values.name && notes.length > 0) {
          await setNotes(
            notes.map((note) => ({
              ...note,
              tags: note.tags.map((t) => (t === tag.name ? values.name : t)),
            })),
          );
        }
        const updatedTags = tags.map((t) => (t.name === tag.name ? { name: values.name, color: values.color } : t));
        await setTags(updatedTags);
        showToast({ title: "Tag Updated" });
      } else {
        await setTags([...tags, { name: values.name, color: values.color }]);
        showToast({ title: "Tag Saved" });
      }
      pop();
    },
    initialValues: { name: tag?.name ?? "", color: tag?.color ?? getRandomColor().name },
    validation: {
      name: (value) => {
        if (!value) {
          return "Tag is required";
        } else if (value.length > 100) {
          return "Tag < 100 chars";
        } else if (tags.some((t) => t.name.toLocaleLowerCase() === value.toLocaleLowerCase() && t.name !== tag?.name)) {
          return "Tag already exists";
        }
      },
    },
  });

  return (
    <Form
      navigationTitle={tag ? "Edit Tag" : "Create Tag"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={tag ? "Save Tag" : "Create Tag"}
            icon={{ source: Icon.SaveDocument, tintColor: getTintColor("green") }}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Tag Name" {...itemProps.name} />
      <Form.Dropdown title="Color" {...itemProps.color}>
        {Object.values(colors).map((color) => (
          <Form.Dropdown.Item
            key={color.name}
            value={color.name}
            title={color.name}
            icon={{ source: "dot.png", tintColor: color.tintColor }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
