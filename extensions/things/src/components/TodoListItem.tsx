import { List, Icon, Color } from '@raycast/api';
import dayjs from 'dayjs';

import { statusIcons } from '../helpers';

import TodoListItemActions from './TodoListItemActions';
import { CommandListName, Todo, List as TList } from '../types';

const getDueDateAccessory = (dueDate: string): List.Item.Accessory => {
  const today = dayjs(dayjs().format('YYYY-MM-DD')).toISOString();
  const diff = dayjs(dueDate).diff(today, 'day');

  let text, color;

  if (diff <= -15 || diff >= 15) {
    text = dayjs(dueDate).format('D MMM');
  } else if (diff === 0) {
    text = 'Due today';
    color = Color.Red;
  } else if (diff > 0 && diff <= 7) {
    text = `${diff} day${diff === 1 ? '' : 's'} left`;
    color = Color.Orange;
  } else if (diff < 0) {
    text = `${-diff} day${diff === -1 ? '' : 's'} ago`;
    color = Color.Red;
  }

  return {
    text: { value: text, color },
    icon: { source: Icon.Flag, tintColor: color },
    tooltip: `Due date: ${dayjs(dueDate).format('dddd DD MMMM YYYY')}`,
  };
};

type TodoListItemProps = {
  todo: Todo;
  refreshTodos: () => void;
  commandListName: CommandListName;
  displayActivationDates?: boolean;
  tags?: string[];
  lists?: TList[];
};

export default function TodoListItem({
  todo,
  refreshTodos,
  commandListName,
  displayActivationDates,
  tags,
  lists,
}: TodoListItemProps) {
  const keywords = [
    todo.name,
    ...todo.notes.split(' '),
    todo.tags,
    todo.project?.name ?? '',
    todo.project?.tags ?? '',
    todo.area?.name ?? '',
    todo.project?.area?.name ?? '',
  ];

  const accessories: List.Item.Accessory[] = [];

  if (todo.tags) {
    accessories.push({ icon: Icon.Tag, text: todo.tags });
  }

  if (todo.activationDate && displayActivationDates) {
    const date = new Date(todo.activationDate);
    accessories.push({
      icon: Icon.Calendar,
      date,
      tooltip: `Start date: ${dayjs(todo.activationDate).format('dddd DD MMMM YYYY')}`,
    });
  }

  if (todo.dueDate) {
    accessories.push(getDueDateAccessory(todo.dueDate));
  }

  return (
    <List.Item
      key={todo.id}
      title={todo.name}
      subtitle={todo.notes}
      icon={statusIcons[todo.status]}
      keywords={keywords}
      accessories={accessories}
      actions={
        <TodoListItemActions
          todo={todo}
          refreshTodos={refreshTodos}
          commandListName={commandListName}
          lists={lists}
          tags={tags}
        />
      }
    />
  );
}
