export type Project = {
  id: number;
  name: string;
  archived: boolean;
  client: string;
  tasks: Task[];
};

export type Task = {
  id: number;
  name: string;
  archived: boolean;
  default: boolean;
};

export type User = {
  id: number;
  name: string;
  groups: string[];
};

export type Timer = {
  date: string;
  startTime: string;
  duration: string;
  duration_in_seconds: number;
  note: string;
  user: User;
  task?: Task;
  project?: Project;
};

export type TimeEntry = {
  id: number;
  date: string;
  starts: string;
  ends: string;
  start_time: string;
  end_time: string;
  duration: string;
  duration_in_seconds: number;
  note: string;
  user: User;
  task: Task;
  project: Project;
};
