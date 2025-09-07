import { Tool } from '@raycast/api';
import { deleteTodo, getTodoName } from '../api';

type Input = {
  /** The todo id to delete */
  todoId: string;
};

export default async function ({ todoId }: Input) {
  return await deleteTodo(todoId);
}

export const confirmation: Tool.Confirmation<Input> = async ({ todoId }: Input) => {
  const name = await getTodoName(todoId);

  return {
    message: `Are you sure you want to delete the todo?`,
    info: [{ name: 'Todo', value: name }],
  };
};
