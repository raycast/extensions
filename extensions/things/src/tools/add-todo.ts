import { addTodo } from '../api';
import { TodoParams } from '../types';

export default async function (props: TodoParams) {
  return await addTodo(props);
}
