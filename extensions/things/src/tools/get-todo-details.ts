import { queryTodoDetails } from '../api';

type Input = {
  /** The ID of the to-do to retrieve full details for. */
  todoId: string;
};

export default async function ({ todoId }: Input) {
  if (!todoId?.trim()) {
    throw new Error('todoId is required.');
  }
  const details = await queryTodoDetails(todoId.trim());
  if (!details) {
    throw new Error(`To-do with ID "${todoId}" not found.`);
  }
  return details;
}
