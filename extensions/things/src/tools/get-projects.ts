import { getCollections } from '../api';
import { Area, Project, Todo } from '../types';

type Output = Omit<Project, 'area' | 'todos'> & {
  area?: Omit<Area, 'todos'>;
  todos?: Omit<Todo, 'project' | 'area'>[];
};

export default async function (): Promise<Output[]> {
  const { projects } = await getCollections('projects');
  return projects;
}
