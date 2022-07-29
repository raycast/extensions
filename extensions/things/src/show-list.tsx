import _ from 'lodash';
import { List, Detail, Icon, ActionPanel, showToast, Action, LocalStorage, Toast } from '@raycast/api';
import { useCallback, useEffect, useState, Fragment } from 'react';
import dayjs from 'dayjs';
import {
  ListName,
  Todo,
  setTodoProperty,
  deleteTodo,
  getTodoGroup,
  thingsNotRunningError,
  getTodoGroupId,
  getListTodos,
} from './shared';
import AddNewTodo from './add-new-todo';

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
  canceled: Icon.XMarkCircle,
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
            <Action.OpenInBrowser title="Open in Things" icon={Icon.ArrowRight} url={`things:///show?id=${id}`} />
            {status !== 'completed' && (
              <Action
                title="Mark as Completed"
                icon={statusIcons.completed}
                onAction={async () => {
                  await setTodoProperty(id, 'status', 'completed');
                  await showToast({
                    style: Toast.Style.Success,
                    title: 'Marked as Completed',
                  });
                  refreshTodos();
                  // Force additional refresh once todo has been removed from list by Things
                  setTimeout(refreshTodos, 2000);
                }}
              />
            )}
            {status !== 'canceled' && (
              <Action
                title="Mark as Canceled"
                icon={statusIcons.canceled}
                onAction={async () => {
                  await setTodoProperty(id, 'status', 'canceled');
                  await showToast({
                    style: Toast.Style.Success,
                    title: 'Marked as Canceled',
                  });
                  refreshTodos();
                }}
              />
            )}
            <Action
              title="Delete"
              icon={Icon.Trash}
              shortcut={{ modifiers: ['ctrl'], key: 'x' }}
              onAction={async () => {
                await deleteTodo(id);
                await showToast({
                  style: Toast.Style.Success,
                  title: 'Deleted',
                });
                refreshTodos();
              }}
            />
          </ActionPanel.Section>
          {project && (
            <ActionPanel.Section title={`Project: ${project.name}`}>
              <Action.OpenInBrowser
                title="Open in Things"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ['cmd'], key: 'o' }}
                url={`things:///show?id=${project.id}`}
              />
            </ActionPanel.Section>
          )}
          {area && (
            <ActionPanel.Section title={`Area: ${area.name}`}>
              <Action.OpenInBrowser
                title="Open in Things"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ['opt'], key: 'o' }}
                url={`things:///show?id=${area.id.replace('THMAreaParentSource/', '')}`}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title={`List: ${listName}`}>
            <Action.OpenInBrowser
              title="Open in Things"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ['ctrl'], key: 'o' }}
              url={`things:///show?id=${listName.toLowerCase()}`}
            />
            <Action.Push
              title="Add New To-Do"
              icon={Icon.Plus}
              shortcut={{ modifiers: ['cmd'], key: 'n' }}
              target={<AddNewTodo listName={listName} />}
            />
            <Action
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
  const value = (await LocalStorage.getItem(key)) as string;
  if (value) {
    return JSON.parse(value);
  }
};

const setCachedListTodos = async (listName: ListName, todos: Todo[]): Promise<void> => {
  const key = getListTodosCacheKey(listName);
  const value = JSON.stringify(todos);
  if (value) {
    return LocalStorage.setItem(key, value);
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
                  <Action.Push
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
                  <Action.OpenInBrowser
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
