import { List, Detail } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useState } from 'react';

import { CommandListName, Todo, getListTodos, getLists, getTags, thingsNotRunningError } from '../api';
import { plural } from '../utils';

import TodoListEmptyView from './TodoListEmptyView';
import TodoListItem from './TodoListItem';

type TodoListProps = {
  commandListName: CommandListName;
  displayActivationDates?: boolean;
};

export default function TodoList({ commandListName, displayActivationDates }: TodoListProps) {
  const { data: tags } = useCachedPromise(() => getTags());
  const { data: lists } = useCachedPromise(() => getLists());

  const [searchText, setSearchText] = useState('');

  const { data: todos, isLoading, mutate } = useCachedPromise((name) => getListTodos(name), [commandListName]);

  if (!todos && !isLoading) return <Detail markdown={thingsNotRunningError} />;

  const sections =
    todos?.reduce(
      (acc, todo: Todo) => {
        const key = todo.project?.id || todo.area?.id || 'no-project-or-area';
        if (!acc[key]) {
          acc[key] = { title: todo.project?.name || todo.area?.name, todos: [] };
        }
        acc[key].todos.push(todo);
        return acc;
      },
      {} as Record<string, { title?: string; todos: Todo[] }>,
    ) ?? {};

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by name, notes, tags, project or area"
      onSearchTextChange={setSearchText}
      filtering
    >
      {Object.entries(sections).map(([key, section]) => {
        if (key === 'no-project-or-area') {
          return section.todos.map((todo) => (
            <TodoListItem
              key={todo.id}
              todo={todo}
              refreshTodos={mutate}
              commandListName={commandListName}
              displayActivationDates={displayActivationDates}
              tags={tags}
              lists={lists}
            />
          ));
        }

        return (
          <List.Section key={key} title={section.title} subtitle={plural(section.todos.length, 'todo')}>
            {section.todos.map((todo) => (
              <TodoListItem
                key={todo.id}
                todo={todo}
                refreshTodos={mutate}
                commandListName={commandListName}
                tags={tags}
                lists={lists}
              />
            ))}
          </List.Section>
        );
      })}

      <TodoListEmptyView searchText={searchText} commandListName={commandListName} />
    </List>
  );
}
