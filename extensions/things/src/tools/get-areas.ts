import { getCollections } from '../api';
import { Area, Todo } from '../types';

type Output = Omit<Area, 'todos'> & {
  todos?: Omit<Todo, 'project' | 'area'>[];
};

export default async function (): Promise<Output[]> {
  const { areas } = await getCollections('areas');
  return areas;
}
