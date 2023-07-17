import { MenuBarExtra, Icon, open } from '@raycast/api';
import { useEffect, useState } from 'react';
import { Todo, ListName, getListTodos, setTodoProperty } from './shared';

const TASK_NAME_LENGTH_LIMIT = 30;

export default function ShowCurrentTaskCommand() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    try {
      setTodos(await getListTodos(ListName.Today));
    } catch (err) {
      // Do nothing
    } finally {
      setIsLoading(false);
    }
  }

  async function completeTaskAndRefresh(id: string) {
    await setTodoProperty(id, 'status', 'completed');
    return refresh();
  }

  useEffect(() => {
    refresh();
  }, []);

  const tooltip = todos.length > 0 ? todos[0].name : '';
  const title = tooltip.length > TASK_NAME_LENGTH_LIMIT ? tooltip.substring(0, TASK_NAME_LENGTH_LIMIT) + '…' : tooltip;

  return (
    <MenuBarExtra icon="things-icon.png" title={title} tooltip={tooltip} isLoading={isLoading}>
      {todos.length > 0 ? (
        <>
          <MenuBarExtra.Item
            title="Complete"
            icon={Icon.CheckCircle}
            onAction={() => {
              completeTaskAndRefresh(todos[0].id);
            }}
          />
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item title="Today" />
        </>
      ) : null}

      {todos.map((todo: Todo) => (
        <MenuBarExtra.Item
          title={todo.name}
          key={todo.id}
          onAction={() => {
            open(`things:///show?id=${todo.id}`);
          }}
        />
      ))}
    </MenuBarExtra>
  );
}
