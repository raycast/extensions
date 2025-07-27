import { CommandListName, getListTodos } from '../api';

type Input = {
  /** The name of the list to get todos from */
  commandListName: CommandListName;
};

export default async function ({ commandListName }: Input) {
  const todos = await getListTodos(commandListName);
  return todos;
}
