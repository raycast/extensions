import { Action, Icon } from '@raycast/api';
import { Todo } from './todo';
import { TodoForm } from './todo-form.component';

export function EditTodoAction(props: { onUpdate: (todo: Todo) => void; todo: Todo }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title='Edit To-do'
      shortcut={{ modifiers: ['cmd'], key: 'e' }}
      target={<TodoForm onCreate={props.onUpdate} todo={props.todo} />}
    />
  );
}
