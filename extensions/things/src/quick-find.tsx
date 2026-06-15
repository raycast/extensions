import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useMemo } from 'react';
import { getQuickFindData } from './api';
import { getTypeIcon } from './helpers';
import { capitalize } from './utils';
import ErrorView from './components/ErrorView';

interface SearchItem {
  id: string;
  name: string;
  type: 'area' | 'project' | 'todo';
  project?: string;
  area?: string;
}

export default function Command() {
  // Single query against Things' SQLite DB — bypasses slow Apple Events
  const { data, isLoading, error, revalidate } = useCachedPromise(getQuickFindData);

  const items = useMemo(() => {
    if (!data) return [];

    const allItems: SearchItem[] = [];
    const seenIds = new Set<string>();

    // Add areas
    for (const area of data.areas) {
      if (!seenIds.has(area.id)) {
        seenIds.add(area.id);
        allItems.push({
          id: area.id,
          name: area.name,
          type: 'area',
        });
      }
    }

    // Add projects
    for (const project of data.projects) {
      if (!seenIds.has(project.id)) {
        seenIds.add(project.id);
        allItems.push({
          id: project.id,
          name: project.name,
          type: 'project',
          area: project.areaName,
        });
      }
    }

    // Add todos from all lists (deduplicated)
    for (const todo of data.todos) {
      if (!seenIds.has(todo.id)) {
        seenIds.add(todo.id);
        allItems.push({
          id: todo.id,
          name: todo.name,
          type: 'todo',
          project: todo.projectName,
          area: todo.areaName,
        });
      }
    }

    return allItems;
  }, [data]);

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search areas, projects, and to-dos...">
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          subtitle={item.project || item.area}
          icon={getTypeIcon(item.type)}
          accessories={[{ text: capitalize(item.type) }]}
          actions={
            <ActionPanel>
              <Action.Open title="Open in Things" target={`things:///show?id=${item.id}`} icon={Icon.AppWindow} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
