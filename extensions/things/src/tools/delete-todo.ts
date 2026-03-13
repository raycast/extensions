import { Tool } from '@raycast/api';
import { deleteTodo, getTodoName } from '../api';

type Input = {
  /** The to-do id to delete */
  todoId: string;
};

export default async function ({ todoId }: Input) {
  return await deleteTodo(todoId);
}

export const confirmation: Tool.Confirmation<Input> = async ({ todoId }: Input) => {
  const name = await getTodoName(todoId);

  return {
    message: `Are you sure you want to delete the to-do?`,
    info: [{ name: 'To-Do', value: name }],
  };
};
