import { addTodo, TodoParams } from '../api';

export default async function (props: TodoParams) {
  return await addTodo(props);
}
