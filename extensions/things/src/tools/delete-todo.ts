import { deleteTodo, getTodo } from '../api';

type Input = {
  /** The todo id to delete */
  todoId: string;
};

export default async function ({ todoId }: Input) {
  return await deleteTodo(todoId);
}

export const confirmation = async ({ todoId }: Input) => {
  const todo = await getTodo(todoId);

  return {
    message: `Are you sure you want to delete the todo?`,
    info: [{ name: 'Todo', value: todo?.name || 'hej' }],
  };
};
