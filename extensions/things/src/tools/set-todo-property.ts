import { setTodoProperty } from '../api';

type Input = {
  /** The to-do id to update */
  todoId: string;
  /** The key to update */
  key: string;
  /** The value to update */
  value: string;
};

export default async function ({ todoId, key, value }: Input) {
  return await setTodoProperty(todoId, key, value);
}
