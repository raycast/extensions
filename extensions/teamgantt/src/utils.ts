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

export const STATUSES = ['PunchedIn', 'Pastdue', 'Upcoming', 'Completed'] as const;
export type Status = (typeof STATUSES)[number];
export type StatusRecord = Record<Status, Task[]>;

export const groupTasksByStatus = (tasks: Task[], punchedInTaskId?: number): Record<Status, Task[]> => {
  const now = today();
  const grouped = tasks.reduce<StatusRecord>(
    (groups, task) => {
      if (punchedInTaskId !== undefined && task.id === punchedInTaskId) {
        groups.PunchedIn.push(task);
      } else if (task.percent_complete === 100) {
        groups.Completed.push(task);
      } else if (task.end_date < now) {
        groups.Pastdue.push(task);
      } else {
        groups.Upcoming.push(task);
      }

      return groups;
    },
    {
      PunchedIn: [],
      Pastdue: [],
      Upcoming: [],
      Completed: [],
    } as StatusRecord
  );

  return grouped;
};

function today() {
  const date = new Date();
  const formattedDate = date
    .toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\//g, '-');

  return formattedDate;
}
