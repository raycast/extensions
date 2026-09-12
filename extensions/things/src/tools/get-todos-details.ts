import { queryTodosDetails } from '../api';

type Input = {
  /**
   * Comma-separated list of to-do IDs to retrieve full details for.
   * Always prefer this tool over calling get-todo-details in a loop.
   */
  todoIds: string;
};

export default async function ({ todoIds }: Input) {
  if (!todoIds?.trim()) {
    throw new Error('todoIds is required (comma-separated list of IDs).');
  }
  const ids = todoIds
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (!ids.length) {
    throw new Error('No valid IDs found in todoIds.');
  }
  return await queryTodosDetails(ids);
}
