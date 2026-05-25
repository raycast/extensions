import { Detail, Icon } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import dayjs from 'dayjs';
import { type ReactNode } from 'react';

import { getListTodos } from '../api';
import { statusIcons, getDeadlineColor } from '../helpers';
import { CommandListName, Todo } from '../types';

type TodoDetailProps = {
  todoId: string;
  initialTodo: Todo;
  commandListName: CommandListName;
  parentRefresh: () => Promise<unknown>;
  renderActions: (todo: Todo, refreshTodos: () => Promise<void>) => ReactNode;
};

const statusLabels: Record<Todo['status'], string> = {
  open: 'Open',
  completed: 'Completed',
  canceled: 'Canceled',
};

const formatDate = (iso: string) => dayjs(iso).format('MMM D, YYYY');

export default function TodoDetail({
  todoId,
  initialTodo,
  commandListName,
  parentRefresh,
  renderActions,
}: TodoDetailProps) {
  const { data: todos, mutate } = useCachedPromise((name) => getListTodos(name), [commandListName]);
  const todo = todos?.find((t) => t.id === todoId) ?? initialTodo;

  async function refreshTodos() {
    await parentRefresh();
    await mutate();
  }

  const area = todo.area || todo.project?.area;
  const tagList = todo.tags?.split(', ').filter(Boolean) ?? [];

  const markdown = `# ${todo.name}\n\n${todo.notes?.trim() || '_No notes_'}`;

  const deadlineColor = todo.dueDate ? getDeadlineColor(todo.dueDate) : undefined;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" icon={statusIcons[todo.status]} text={statusLabels[todo.status]} />
          {todo.creationDate && (
            <Detail.Metadata.Label title="Created" icon={Icon.Plus} text={formatDate(todo.creationDate)} />
          )}
          {todo.activationDate && (
            <Detail.Metadata.Label title="Start Date" icon={Icon.Calendar} text={formatDate(todo.activationDate)} />
          )}
          {todo.dueDate && (
            <Detail.Metadata.Label
              title="Deadline"
              icon={deadlineColor ? { source: Icon.Flag, tintColor: deadlineColor } : Icon.Flag}
              text={
                deadlineColor ? { value: formatDate(todo.dueDate), color: deadlineColor } : formatDate(todo.dueDate)
              }
            />
          )}
          {tagList.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {tagList.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} icon={Icon.Tag} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {(todo.project || area) && <Detail.Metadata.Separator />}
          {todo.project && (
            <Detail.Metadata.Link
              title="Project"
              text={todo.project.name}
              target={`things:///show?id=${todo.project.id}`}
            />
          )}
          {area && (
            <Detail.Metadata.Link
              title="Area"
              text={area.name}
              target={`things:///show?id=${area.id.replace('THMAreaParentSource/', '')}`}
            />
          )}
        </Detail.Metadata>
      }
      actions={renderActions(todo, refreshTodos)}
    />
  );
}
