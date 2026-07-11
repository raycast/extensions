import { useAtom } from "jotai";
import _ from "lodash";
import { todoAtom, editingDueDateAtom, editingDueDateValueAtom } from "./atoms";
import { ActionPanel, Form, Action, useNavigation } from "@raycast/api";
import { useState } from "react";

const TodoDueDateForm = () => {
  const { pop } = useNavigation();
  const [todoSections, setTodoSections] = useAtom(todoAtom);
  const [editingDueDate] = useAtom(editingDueDateAtom);
  const [editingDueDateValue] = useAtom(editingDueDateValueAtom);
  const [dueDate, setDueDate] = useState<Date | null>(editingDueDateValue > 0 ? new Date(editingDueDateValue) : null);

  const editTodoDueDate = async () => {
    if (!editingDueDate) return;

    todoSections[editingDueDate.sectionKey].splice(editingDueDate.index, 1, {
      ...todoSections[editingDueDate.sectionKey][editingDueDate.index],
      dueDate: dueDate ? dueDate.getTime() : undefined,
    });
    setTodoSections(_.cloneDeep(todoSections));
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={() => {
              editTodoDueDate();
              pop();
            }}
          />
          <Action onAction={() => pop()} title="Cancel" />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="dueDate" onChange={setDueDate} title="Due date" value={dueDate} />
    </Form>
  );
};

export default TodoDueDateForm;
