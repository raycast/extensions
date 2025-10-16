import { getListTodos } from '../api';
import { CommandListName } from '../types';

type Input = {
  /** The name of the list to get to-dos from */
  commandListName: CommandListName;
};

export default async function ({ commandListName }: Input) {
  const todos = await getListTodos(commandListName);
  return todos;
}
