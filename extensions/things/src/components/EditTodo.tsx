import { ActionPanel, Action, Form, useNavigation } from '@raycast/api';
import { FormValidation, useForm } from '@raycast/utils';

import { handleError, updateTodo } from '../api';
import { Todo } from '../types';

type EditTodoProps = {
  todo: Todo;
  refreshTodos: () => void;
};

export default function EditTodo({ todo, refreshTodos }: EditTodoProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ title: string; notes: string }>({
    async onSubmit(values) {
      try {
        await updateTodo(todo.id, { notes: values.notes, title: values.title });
        refreshTodos();
        pop();
      } catch (error) {
        handleError(error);
      }
    },
    initialValues: { title: todo.name, notes: todo.notes },
    validation: { title: FormValidation.Required },
  });

  return (
    <Form
      navigationTitle={`Edit "${todo.name}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit To-Do" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="New to-do" />

      <Form.TextArea
        {...itemProps.notes}
        title="Notes"
        placeholder="Write some notes (Markdown enabled)"
        enableMarkdown
      />
    </Form>
  );
}
