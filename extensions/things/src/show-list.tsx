import _ from 'lodash';
import {
  List,
  Detail,
  Icon,
  ActionPanel,
  OpenInBrowserAction,
  getLocalStorageItem,
  setLocalStorageItem,
  PushAction,
  showToast,
  ToastStyle,
} from '@raycast/api';
import { useCallback, useEffect, useState, Fragment } from 'react';
import dayjs from 'dayjs';
import { ListName, executeJxa, thingsNotRunningError } from './shared';
import AddNewTodo from './add-new-todo';

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
                  await showToast(ToastStyle.Success, 'Marked as Completed');
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
                  await showToast(ToastStyle.Success, 'Marked as Canceled');
                  refreshTodos();
                }}
              />
            )}
            <ActionPanel.Item
              title="Delete"
              icon={Icon.Trash}
              shortcut={{ modifiers: ['ctrl'], key: 'x' }}
              onAction={async () => {
                await deleteTodo(id);
                await showToast(ToastStyle.Success, 'Deleted');
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
            <PushAction
              title="Add New To-Do"
              icon={Icon.Plus}
              shortcut={{ modifiers: ['cmd'], key: 'n' }}
              target={<AddNewTodo listName={listName} />}
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

const getCachedListTodos = async (listName: ListName): Promise<Todo[] | undefined> => {
  const key = getListTodosCacheKey(listName);
  const value = (await getLocalStorageItem(key)) as string;
  if (value) {
    return JSON.parse(value);
  }
};

const setCachedListTodos = async (listName: ListName, todos: Todo[]): Promise<void> => {
  const key = getListTodosCacheKey(listName);
  const value = JSON.stringify(todos);
  if (value) {
    return setLocalStorageItem(key, value);
  }
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
  const [thingsNotRunning, setThingsNotRunning] = useState(false);
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
    setIsLoading(false);
    if (!results) {
      return setThingsNotRunning(true);
    }

    setTodos(results);

    if (useCache) {
      setCachedListTodos(ListName[listName], results);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  if (thingsNotRunning) {
    return <Detail markdown={thingsNotRunningError} />;
  }

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
      <List.Section title={`Use "${searchText}" with…`}>
        {searchText !== '' && (
          <Fragment>
            <List.Item
              key="fallback-add-new-todo"
              title="Add New To-Do"
              icon={Icon.Plus}
              actions={
                <ActionPanel>
                  <PushAction
                    icon={Icon.Plus}
                    title="Add New To-Do"
                    target={<AddNewTodo title={searchText} listName={listName} />}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              key="fallback-search-in-things"
              title="Search in Things"
              icon={Icon.MagnifyingGlass}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction
                    title="Search in Things"
                    icon={Icon.MagnifyingGlass}
                    url={`things:///search?query=${searchText}`}
                  />
                </ActionPanel>
              }
            />
          </Fragment>
        )}
      </List.Section>
    </List>
  );
}
