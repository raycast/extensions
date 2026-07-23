import { searchTodos } from '../api';

type Input = {
  /** The search query to find to-dos by title or notes. */
  query: string;
};

export default async function ({ query }: Input) {
  if (!query?.trim()) {
    throw new Error('A non-empty query is required.');
  }
  return await searchTodos(query.trim());
}
