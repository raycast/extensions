import { Detail, Color, Icon } from '@raycast/api';
import dayjs from 'dayjs';

import { statusIcons } from '../helpers';

import TodoListItemActions from './TodoListItemActions';
import { CommandListName, Todo, List as TList } from '../types';

type TodoDetailProps = {
  todo: Todo;
  refreshTodos: () => Promise<void>;
  commandListName: CommandListName;
  lists?: TList[];
  tags?: string[];
};

const statusLabels: Record<Todo['status'], string> = {
  open: 'Open',
  completed: 'Completed',
  canceled: 'Canceled',
};

const formatDate = (iso: string) => dayjs(iso).format('MMM D, YYYY');

function getDeadlineColor(deadline: string): Color | undefined {
  const today = dayjs(dayjs().format('YYYY-MM-DD')).toISOString();
  const diff = dayjs(deadline).diff(today, 'day');
  if (Math.abs(diff) >= 15) return undefined;
  if (diff <= 0) return Color.Red;
  return Color.Orange;
}

export default function TodoDetail({ todo, refreshTodos, commandListName, lists, tags }: TodoDetailProps) {
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
      actions={
        <TodoListItemActions
          todo={todo}
          refreshTodos={refreshTodos}
          commandListName={commandListName}
          lists={lists}
          tags={tags}
          fromDetail
        />
      }
    />
  );
}
