import { useAtom } from "jotai";
import _ from "lodash";
import { todoAtom, editingTagAtom, editingTagNameAtom } from "./atoms";
import { ActionPanel, Form, Action, useNavigation, Icon, Color } from "@raycast/api";
import { getTags } from "./tags";
import { useState } from "react";
import { TodoRevisionConflictError } from "./storage";

const TodoTagForm = () => {
  const { pop } = useNavigation();
  const [savedSections, setTodoSections] = useAtom(todoAtom);
  const [editingTag] = useAtom(editingTagAtom);
  const [editingTagName] = useAtom(editingTagNameAtom);
  const [tagName, setTagName] = useState(editingTagName);
  const tags = getTags(savedSections);

  const editTodoTag = () => {
    if (!editingTag) return;

    const todoSections = _.cloneDeep(savedSections);
    todoSections[editingTag.sectionKey].splice(editingTag.index, 1, {
      ...todoSections[editingTag.sectionKey][editingTag.index],
      tag: tagName.trim() || undefined,
    });
    setTodoSections(todoSections);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            onSubmit={() => {
              try {
                editTodoTag();
                pop();
              } catch (error) {
                // The store refreshed the list and cleared this form's stale target.
                if (error instanceof TodoRevisionConflictError) pop();
                else throw error;
              }
            }}
          />
          <Action icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} onAction={() => pop()} title="Cancel" />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="existingTag"
        title="Existing Tags"
        value={tags.includes(tagName) ? `tag:${tagName}` : ""}
        onChange={(value) => {
          if (value) setTagName(value.slice(4));
        }}
      >
        <Form.Dropdown.Item title="Choose an Existing Tag" value="" />
        {tags.map((tag) => (
          <Form.Dropdown.Item key={tag} title={tag} value={`tag:${tag}`} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="tagName"
        onChange={setTagName}
        title="Tag Name"
        info="Choose an existing tag above, enter a new name, or clear this field to remove the tag."
        value={tagName}
      />
    </Form>
  );
};

export default TodoTagForm;
