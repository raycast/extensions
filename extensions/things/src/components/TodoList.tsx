import { List, Detail, getPreferenceValues, Icon } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useMemo, useState } from 'react';

import { getListTodos, getCollections, TagWithParent } from '../api';
import { plural } from '../utils';

import TodoListEmptyView from './TodoListEmptyView';
import TodoListItem from './TodoListItem';
import ErrorView from './ErrorView';
import { CommandListName, Todo } from '../types';

type TodoListProps = {
  commandListName: CommandListName;
  displayActivationDates?: boolean;
};

type Section = { title?: string; todos: Todo[] };

const ALL_TAGS = 'all';
const NO_TAG = 'none';

function parseTags(tagString: string | null | undefined): string[] {
  return tagString?.split(', ').filter(Boolean) ?? [];
}

function buildTagHierarchy(tags: TagWithParent[]) {
  const childrenMap: Record<string, string[]> = {};
  const ancestorPath: Record<string, string[]> = {};

  for (const tag of tags) {
    if (tag.parent) {
      childrenMap[tag.parent] ??= [];
      childrenMap[tag.parent].push(tag.name);
    }
  }

  function computeAncestorPath(tagName: string): string[] {
    if (ancestorPath[tagName]) return ancestorPath[tagName];

    const tag = tags.find((t) => t.name === tagName);
    if (!tag?.parent) {
      ancestorPath[tagName] = [];
      return [];
    }

    const parentPath = computeAncestorPath(tag.parent);
    ancestorPath[tagName] = [...parentPath, tag.parent];
    return ancestorPath[tagName];
  }

  function getDescendants(tagName: string): string[] {
    const children = childrenMap[tagName] || [];
    const descendants = [...children];
    for (const child of children) {
      descendants.push(...getDescendants(child));
    }
    return descendants;
  }

  for (const tag of tags) {
    computeAncestorPath(tag.name);
  }

  return { childrenMap, ancestorPath, getDescendants };
}

export default function TodoList({ commandListName, displayActivationDates }: TodoListProps) {
  const preferences = getPreferenceValues<Preferences>();

  const [searchText, setSearchText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>(ALL_TAGS);

  const { data: todos, isLoading, error, mutate } = useCachedPromise((name) => getListTodos(name), [commandListName]);

  const { data: collections } = useCachedPromise(() => getCollections('tagsWithHierarchy', 'lists'), [], {
    execute: !!todos,
  });
  const tagsWithHierarchy = collections?.tagsWithHierarchy;
  const lists = collections?.lists;

  const tagHierarchy = useMemo(() => {
    if (!tagsWithHierarchy) return null;
    return buildTagHierarchy(tagsWithHierarchy);
  }, [tagsWithHierarchy]);

  const applicableTags = useMemo(() => {
    if (!todos || !tagHierarchy) return new Set<string>();

    const tagSet = new Set<string>();

    for (const todo of todos) {
      for (const tag of parseTags(todo.tags)) tagSet.add(tag);
      for (const tag of parseTags(todo.project?.tags)) tagSet.add(tag);
      for (const tag of parseTags(todo.areaTags)) tagSet.add(tag);
    }

    // Include ancestor tags so users can filter by parent
    const withAncestors = new Set<string>();
    for (const tag of tagSet) {
      withAncestors.add(tag);
      for (const ancestor of tagHierarchy.ancestorPath[tag] || []) {
        withAncestors.add(ancestor);
      }
    }

    return withAncestors;
  }, [todos, tagHierarchy]);

  const applicableTagsWithHierarchy = useMemo(() => {
    if (!tagsWithHierarchy) return [];
    return tagsWithHierarchy.filter((t) => applicableTags.has(t.name));
  }, [tagsWithHierarchy, applicableTags]);

  const tagDisplayNames = useMemo(() => {
    if (!tagsWithHierarchy || !tagHierarchy) return {};
    const display: Record<string, string> = {};
    for (const tag of tagsWithHierarchy) {
      const path = tagHierarchy.ancestorPath[tag.name];
      display[tag.name] = path.length > 0 ? `${path.join(' › ')} › ${tag.name}` : tag.name;
    }
    return display;
  }, [tagsWithHierarchy, tagHierarchy]);

  const expandedTags = useMemo(() => {
    if (selectedTag === ALL_TAGS || selectedTag === NO_TAG || !tagHierarchy) return null;
    const descendants = tagHierarchy.getDescendants(selectedTag);
    return new Set([selectedTag, ...descendants]);
  }, [selectedTag, tagHierarchy]);

  const filteredTodos = useMemo(() => {
    if (selectedTag === ALL_TAGS) return todos;

    if (selectedTag === NO_TAG) {
      return todos?.filter((todo) => {
        const allTags = [...parseTags(todo.tags), ...parseTags(todo.project?.tags), ...parseTags(todo.areaTags)];
        return allTags.length === 0;
      });
    }

    if (!expandedTags) return todos;

    return todos?.filter((todo) => {
      const allTags = [...parseTags(todo.tags), ...parseTags(todo.project?.tags), ...parseTags(todo.areaTags)];
      return allTags.some((tag) => expandedTags.has(tag));
    });
  }, [selectedTag, todos, expandedTags]);

  if (error) {
    return <ErrorView error={error} onRetry={() => mutate()} />;
  }

  if (!todos && !isLoading) {
    return (
      <Detail markdown="## No Data\n\nNo to-dos found and no error occurred. This might indicate an issue with the Things connection." />
    );
  }

  const groupByProjectOrArea = preferences.groupByProjectOrArea !== false;

  const sections: Record<string, Section> = groupByProjectOrArea
    ? (filteredTodos?.reduce<Record<string, Section>>((acc, todo) => {
        const key = todo.project?.id || todo.area?.id || 'no-project-or-area';
        acc[key] ??= { title: todo.project?.name || todo.area?.name, todos: [] };
        acc[key].todos.push(todo);
        return acc;
      }, {}) ?? {})
    : { 'no-project-or-area': { title: undefined, todos: filteredTodos ?? [] } };

  const tags = tagsWithHierarchy?.map((t) => t.name);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by name, notes, project or area"
      onSearchTextChange={setSearchText}
      filtering
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Tag" value={selectedTag} onChange={setSelectedTag} placeholder="Tag">
          <List.Dropdown.Section>
            <List.Dropdown.Item title="All Tags" value={ALL_TAGS} />
            <List.Dropdown.Item title="No Tag" value={NO_TAG} />
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            {applicableTagsWithHierarchy.map((tag) => (
              <List.Dropdown.Item
                key={tag.name}
                title={tagDisplayNames[tag.name] || tag.name}
                value={tag.name}
                icon={Icon.Tag}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
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
          <List.Section key={key} title={section.title} subtitle={plural(section.todos.length, 'to-do')}>
            {section.todos.map((todo) => (
              <TodoListItem
                key={todo.id}
                todo={todo}
                refreshTodos={mutate}
                commandListName={commandListName}
                displayActivationDates={displayActivationDates}
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
