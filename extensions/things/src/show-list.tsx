import {
  List,
  Icon,
  ToastStyle,
  ActionPanel,
  OpenInBrowserAction,
  showToast,
  getLocalStorageItem,
  setLocalStorageItem,
  environment,
} from '@raycast/api';
import { useEffect, useState } from 'react';
import osascript from 'osascript-tag';
import dayjs from 'dayjs';
import groupBy from 'lodash.groupby';
import map from 'lodash.map';

enum ListName {
  Inbox = 'Inbox',
  Today = 'Today',
  Anytime = 'Anytime',
  Upcoming = 'Upcoming',
  Someday = 'Someday',
  Logbook = 'Logbook',
  Trash = 'Trash',
}

enum TodoStatus {
  open = 'open',
  completed = 'completed',
}

interface Todo {
  id: string;
  name: string;
  status: TodoStatus;
  tags: string[];
  project: TodoGroup;
  area: TodoGroup;
  dueDate: string;
  notes: string;
  // creationDate: string;
  // activationDate: string;
  // modificationDate: string;
  // completionDate: string;
  // cancellationDate: string;
}

interface TodoGroup {
  id: string;
  name: string;
}

const executeJxa = async (script: string) => {
  try {
    const result = await osascript.jxa({ parse: true })`${script}`;
    return result;
  } catch (err: unknown) {
    if (typeof err === 'string') {
      const message = err.replace('execution error: Error: ', '');
      if (message.match(/Application can't be found/)) {
        showToast(ToastStyle.Failure, 'Application not found', 'Things must be running');
      } else {
        showToast(ToastStyle.Failure, 'Something went wrong', message);
      }
    }
  }
};

const getListTodos = (listName: ListName) =>
  executeJxa(`
  const things = Application('Things');
  const todos = things.lists.byName('${listName}').toDos();
  return todos.map(todo => ({
    id: todo.id(),
    name: todo.name(),
    status: todo.status(),
    notes: todo.notes(),
    tags: todo.tagNames().split(', '),
    dueDate: todo.dueDate() && todo.dueDate().toISOString(),
    project: todo.project() && {
      id: todo.project().id(),
      name: todo.project().name(),
    },
    area: todo.area() && {
      id: todo.area().id(),
      name: todo.area().name(),
    }
  }));
`);

const setTodoProperty = (todoId: string, key: string, value: string) =>
  executeJxa(`
  const things = Application('Things');
  things.toDos.byId('${todoId}').${key} = '${value}';
`);

const getTodoGroupId = (todo: Todo) => todo.project?.id || todo.area?.id;
const getTodoGroup = (todo: Todo) => todo.project || todo.area;

// Start of day as ISO
const today = dayjs(dayjs().format('YYYY-MM-DD')).toISOString();
const formatDueDate = (dueDate: string) => {
  const diff = dayjs(dueDate).diff(today, 'day');
  if (diff <= -15 || diff >= 15) {
    return dayjs(dueDate).format('D MMM');
  } else if (diff === 0) {
    return 'today';
  } else if (diff > 0) {
    return `${diff} day${diff === 1 ? '' : 's'} left`;
  } else if (diff < 0) {
    return `${-diff} day${diff === -1 ? '' : 's'} ago`;
  }
};

function TodoListItem(props: { todo: Todo }) {
  const { todo } = props;
  const { id, name, status, dueDate, notes, tags = [], project, area } = todo;
  return (
    <List.Item
      key={id}
      title={name}
      subtitle={notes}
      icon={status === 'completed' ? Icon.Checkmark : Icon.Circle}
      accessoryTitle={dueDate && `⚑  ${formatDueDate(dueDate)}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={name}>
            <OpenInBrowserAction title="Open in Things" url={`things:///show?id=${id}`} />
            {environment.isDevelopment && status === 'open' && (
              <ActionPanel.Item title="Mark as Completed" onAction={() => setTodoProperty(id, 'status', 'completed')} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
      keywords={[...tags, project?.name, area?.name]}
    />
  );
}

function TodoListSection(props: { todos: Todo[] }) {
  const { todos } = props;
  const { id, name } = getTodoGroup(todos[0]) || {};

  const listSectionProps = id ? { key: id, title: name } : {};
  return (
    <List.Section {...listSectionProps}>
      {map(todos, (todo: Todo) => (
        <TodoListItem key={todo.id} todo={todo} />
      ))}
    </List.Section>
  );
}

const getListTodosCacheKey = (listName: ListName): string => `list:${listName}:todos`;

const getCachedListTodos = async (listName: ListName): Promise<Todo[]> => {
  const key = getListTodosCacheKey(listName);
  const value = (await getLocalStorageItem(key)) as string;
  return value && JSON.parse(value);
};

const setCachedListTodos = async (listName: ListName, todos: Todo[]): Promise<void> => {
  const key = getListTodosCacheKey(listName);
  const value = JSON.stringify(todos);
  return setLocalStorageItem(key, value);
};

export default function ShowList(props: { listName: ListName }) {
  const [isLoading, setIsLoading] = useState(true);
  const [todos, setTodos] = useState<Todo[]>();
  const { listName } = props;

  useEffect(() => {
    const fetchTodos = async () => {
      const cachedResults = await getCachedListTodos(ListName[listName]);
      if (cachedResults) {
        setTodos(cachedResults);
      }

      const results = await getListTodos(ListName[listName]);
      setTodos(results);
      setIsLoading(false);

      setCachedListTodos(ListName[listName], results);
    };

    fetchTodos();
  }, []);

  const groupedTodos = groupBy(todos, getTodoGroupId);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by name, tags, project or area…">
      {map(groupedTodos, (todos: Todo[], groupId: string) => (
        <TodoListSection key={groupId} todos={todos} />
      ))}
    </List>
  );
}
