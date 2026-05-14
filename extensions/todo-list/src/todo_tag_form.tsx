import { useAtom } from "jotai";
import _ from "lodash";
import { todoAtom, editingTagAtom, editingTagNameAtom } from "./atoms";
import { ActionPanel, Form, Action, useNavigation, Icon, Color } from "@raycast/api";
import { useState } from "react";

const TodoTagForm = () => {
  const { pop } = useNavigation();
  const [todoSections, setTodoSections] = useAtom(todoAtom);
  const [editingTag] = useAtom(editingTagAtom);
  const [editingTagName] = useAtom(editingTagNameAtom);
  const [tagName, setTagName] = useState(editingTagName);

  const editTodoTag = async () => {
    if (!editingTag) return;

    todoSections[editingTag.sectionKey].splice(editingTag.index, 1, {
      ...todoSections[editingTag.sectionKey][editingTag.index],
      tag: tagName,
    });
    setTodoSections(_.cloneDeep(todoSections));
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            onSubmit={() => {
              editTodoTag();
              pop();
            }}
          />
          <Action icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} onAction={() => pop()} title="Cancel" />
        </ActionPanel>
      }
    >
      <Form.TextField id="tagName" onChange={setTagName} title="Tag Name" value={tagName} />
    </Form>
  );
};

export default TodoTagForm;
