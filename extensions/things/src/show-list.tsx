import _ from 'lodash';
import {
  List,
  Icon,
  ToastStyle,
  ActionPanel,
  OpenInBrowserAction,
  showToast,
  getLocalStorageItem,
  setLocalStorageItem,
} from '@raycast/api';
import { useCallback, useEffect, useState } from 'react';
import osascript from 'osascript-tag';
import dayjs from 'dayjs';

enum ListName {
  Inbox = 'Inbox',
  Today = 'Today',
  Anytime = 'Anytime',
  Upcoming = 'Upcoming',
  Someday = 'Someday',
}

enum TodoStatus {
  open = 'open',
  completed = 'completed',
  canceled = 'canceled',
}

interface Todo {
  id: string;
  name: string;
  status: TodoStatus;
  tags: string;
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
  tags: string;
  area?: TodoGroup;
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

const listNameToListIdMapping = {
  Inbox: 'TMInboxListSource',
  Today: 'TMTodayListSource',
  Anytime: 'TMNextListSource',
  Upcoming: 'TMCalendarListSource',
  Someday: 'TMSomedayListSource',
};

const getListTodos = (listName: ListName) =>
  executeJxa(`
  const things = Application('Things');
  const todos = things.lists.byId('${listNameToListIdMapping[listName]}').toDos();
  return todos.map(todo => ({
    id: todo.id(),
    name: todo.name(),
    status: todo.status(),
    notes: todo.notes(),
    tags: todo.tagNames(),
    dueDate: todo.dueDate() && todo.dueDate().toISOString(),
    project: todo.project() && {
      id: todo.project().id(),
      name: todo.project().name(),
      tags: todo.project().tagNames(),
      area: todo.project().area() && {
        id: todo.project().area().id(),
        name: todo.project().area().name(),
        tags: todo.project().area().tagNames(),
      },
    },
    area: todo.area() && {
      id: todo.area().id(),
      name: todo.area().name(),
      tags: todo.area().tagNames(),
    },
  }));
`);

const setTodoProperty = (todoId: string, key: string, value: string) =>
  executeJxa(`
  const things = Application('Things');
  things.toDos.byId('${todoId}').${key} = '${value}';
`);

const deleteTodo = (todoId: string) =>
  executeJxa(`
  const things = Application('Things');
  things.delete(things.toDos.byId('${todoId}'));
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

const statusIcons = {
  open: Icon.Circle,
  completed: Icon.Checkmark,
  canceled: Icon.XmarkCircle,
};

function TodoListItem(props: { todo: Todo; refreshTodos: () => void; listName: ListName }) {
  const { todo, refreshTodos, listName } = props;
  const { id, name, status, dueDate, project, tags } = todo;
  const area = todo.area || todo.project?.area;
  // const tags = _([todo.tags, todo.project?.tags, todo.area?.tags, todo.project?.area?.tags])
  //   .flatMap((string = '') => string.split(', '))
  //   .compact()
  //   .uniq()
  //   .join(', ');

  return (
    <List.Item
      key={id}
      title={name}
      subtitle={tags}
      icon={statusIcons[status]}
      accessoryTitle={dueDate && `⚑  ${formatDueDate(dueDate)}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={`Todo: ${name}`}>
            <OpenInBrowserAction title="Open in Things" icon={Icon.ArrowRight} url={`things:///show?id=${id}`} />
            {status !== 'completed' && (
              <ActionPanel.Item
                title="Mark as Completed"
                icon={statusIcons.completed}
                onAction={async () => {
                  await setTodoProperty(id, 'status', 'completed');
                  refreshTodos();
                  // Force additional refresh once todo has been removed from list by Things
                  setTimeout(refreshTodos, 2000);
                }}
              />
            )}
            {status !== 'canceled' && (
              <ActionPanel.Item
                title="Mark as Canceled"
                icon={statusIcons.canceled}
                onAction={async () => {
                  await setTodoProperty(id, 'status', 'canceled');
                  refreshTodos();
                }}
              />
            )}
            <ActionPanel.Item
              title="Delete"
              icon={Icon.Trash}
              onAction={async () => {
                await deleteTodo(id);
                refreshTodos();
              }}
            />
          </ActionPanel.Section>
          {project && (
            <ActionPanel.Section title={`Project: ${project.name}`}>
              <OpenInBrowserAction
                title="Open in Things"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ['cmd'], key: 'o' }}
                url={`things:///show?id=${project.id}`}
              />
            </ActionPanel.Section>
          )}
          {area && (
            <ActionPanel.Section title={`Area: ${area.name}`}>
              <OpenInBrowserAction
                title="Open in Things"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ['opt'], key: 'o' }}
                url={`things:///show?id=${area.id.replace('THMAreaParentSource/', '')}`}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title={`List: ${listName}`}>
            <OpenInBrowserAction
              title="Open in Things"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ['ctrl'], key: 'o' }}
              url={`things:///show?id=${listName.toLowerCase()}`}
            />
            <ActionPanel.Item
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ['cmd'], key: 'r' }}
              onAction={refreshTodos}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function TodoListSection(props: { todos: Todo[]; refreshTodos: () => void; listName: ListName }) {
  const { todos, refreshTodos, listName } = props;
  const { id, name } = getTodoGroup(todos[0]) || {};

  const listSectionProps = id ? { key: id, title: name } : {};
  return (
    <List.Section {...listSectionProps} subtitle={plural(todos.length, 'todo')}>
      {_.map(todos, (todo: Todo) => (
        <TodoListItem key={todo.id} todo={todo} refreshTodos={refreshTodos} listName={listName} />
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

const plural = (count: number, string: string) => `${count} ${string}${count > 1 ? 's' : ''}`;

const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const searchKeys = [
  'name',
  'notes',
  'tags',
  'project.name',
  'project.tags',
  'area.name',
  'area.tags',
  'project.area.name',
  'project.area.tags',
];

export default function ShowList(props: { listName: ListName }) {
  const [isLoading, setIsLoading] = useState(true);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const { listName } = props;

  const fetchTodos = useCallback(async (refreshing = false) => {
    const useCache = !refreshing;
    if (refreshing) {
      setIsLoading(true);
    }

    if (useCache) {
      const cachedResults = await getCachedListTodos(ListName[listName]);
      if (cachedResults) {
        setTodos(cachedResults);
      }
    }

    const results = await getListTodos(ListName[listName]);
    setTodos(results);
    setIsLoading(false);

    if (useCache) {
      setCachedListTodos(ListName[listName], results);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const normalizedSearchText = normalizeText(searchText);
  const filteredTodos = _.filter(todos, (todo) =>
    _.some(searchKeys, (key) => {
      const value = _.get(todo, key, '');
      return normalizeText(value).includes(normalizedSearchText);
    })
  );
  const groupedTodos = _.groupBy(filteredTodos, getTodoGroupId);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by name, notes, tags, project or area…"
      onSearchTextChange={setSearchText}
    >
      {_.map(groupedTodos, (todos: Todo[], groupId: string) => (
        <TodoListSection key={groupId} todos={todos} refreshTodos={() => fetchTodos(true)} listName={listName} />
      ))}
    </List>
  );
}
