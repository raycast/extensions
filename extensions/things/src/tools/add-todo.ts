import { addTodo } from '../api';
import { AddTodoParams } from '../types';

export default async function (props: AddTodoParams) {
  return await addTodo(props);
}
