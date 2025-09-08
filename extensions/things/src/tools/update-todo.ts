import { updateTodo } from '../api';
import { TodoParams } from '../types';

type Input = {
  /** The todo id to update */
  todoId: string;
  /** The parameters to update */
  todoParams: TodoParams;
};

export default async function ({ todoId, todoParams }: Input) {
  try {
    const todo = await updateTodo(todoId, todoParams);
    return todo;
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return {
        error: 'No token provided',
        message:
          'Add your Things token in the extension settings. You can find your unique token in Things settings. go to Things → Settings → General → Enable Things URLs → Manage',
      };
    }
    throw error;
  }
}
