import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useMemo } from 'react';
import { getListTodos, getLists } from './api';

interface ListData {
  id: string;
  name: string;
  type: string;
}

interface SearchItem {
  id: string;
  name: string;
  type: string;
  project?: string;
  area?: string;
  status?: string;
}

export default function Command() {
  const { data: lists, isLoading: isLoadingLists } = useCachedPromise(getLists);
  const { data: inboxTodos, isLoading: isLoadingInbox } = useCachedPromise(getListTodos, ['inbox']);
  const { data: todayTodos, isLoading: isLoadingToday } = useCachedPromise(getListTodos, ['today']);
  const { data: anytimeTodos, isLoading: isLoadingAnytime } = useCachedPromise(getListTodos, ['anytime']);
  const { data: somedayTodos, isLoading: isLoadingSomeday } = useCachedPromise(getListTodos, ['someday']);
  const { data: upcomingTodos, isLoading: isLoadingUpcoming } = useCachedPromise(getListTodos, ['upcoming']);

  const isLoading =
    isLoadingLists || isLoadingInbox || isLoadingToday || isLoadingAnytime || isLoadingSomeday || isLoadingUpcoming;

  const items = useMemo(() => {
    const allItems: SearchItem[] = [];
    const seenIds = new Set<string>();

    if (lists) {
      lists.forEach((list: ListData) => {
        if (!seenIds.has(list.id)) {
          seenIds.add(list.id);
          allItems.push({
            id: list.id,
            name: list.name,
            type: list.type === 'area' ? 'area' : 'project',
          });
        }
      });
    }

    const todos = [
      ...(inboxTodos || []),
      ...(todayTodos || []),
      ...(anytimeTodos || []),
      ...(somedayTodos || []),
      ...(upcomingTodos || []),
    ];

    for (const todo of todos) {
      if (!seenIds.has(todo.id)) {
        seenIds.add(todo.id);
        allItems.push({
          id: todo.id,
          name: todo.name,
          type: 'todo',
          project: todo.project?.name,
          area: todo.area?.name,
          status: todo.status,
        });
      }
    }

    return allItems;
  }, [lists, inboxTodos, todayTodos, anytimeTodos, somedayTodos, upcomingTodos]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search areas, projects, and to-dos...">
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          subtitle={item.project || item.area}
          icon={getIcon(item)}
          accessories={[{ text: capitalize(item.type) }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Things" url={`things:///show?id=${item.id}`} icon={Icon.AppWindow} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function getIcon(item: SearchItem) {
  switch (item.type) {
    case 'area':
      return Icon.Box;
    case 'project':
      return Icon.List;
    case 'todo':
      if (item.status === 'completed') return Icon.CheckCircle;
      if (item.status === 'canceled') return Icon.XMarkCircle;
      return Icon.Circle;
    default:
      return Icon.Circle;
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
