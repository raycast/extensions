import { Task } from './types';

export const groupTasksByProject = (tasks: Task[]): Record<string, Task[]> => {
  const grouped = tasks.reduce<Record<string, Task[]>>((groups, task) => {
    if (!groups[task.project_name]) {
      groups[task.project_name] = [];
    }
    groups[task.project_name].push(task);

    return groups;
  }, {});

  return grouped;
};
