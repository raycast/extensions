export type Project = {
  id: string;
  name: string;
};

export type Task = {
  id: string;
  name: string;
  time: { total: number; recent: number };
  projects: Array<string>;
};

export type TaskResp = {
  id: string;
  name: string;
  time: { total: number };
  projects: Array<string>;
};

export type TimeRecordResp = {
  id: number;
  time: number;
  user: number;
  date: string;
  task?: TaskResp;
};

export type TaskTimerResp = {
  status: string;
  task: { name: string };
};

export type TaskStopTimerResp = {
  status: string;
  taskTime: { task: { name: string } };
};

type User = {
  id: number;
  email: string;
  name: string;
  headline: string;
  capacity: number;
};
export type CurrentTimerResp = {
  status: string;
  duration: number;
  user: User;
  startedAt: string;
  userDate: string;
  comment?: string;
  task?: {
    id: string;
  };
};

export type ErrorResponse = {
  code: string;
  message: string;
};
