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
  task: TaskResp;
};

export type TaskTimerResp = {
  status: string;
  task: { name: string };
};

export type TaskStopTimerResp = {
  status: string;
  taskTime: { task: { name: string } };
};

export type CurrentTimerResp = {
  status: string;
  task: { id: string };
};
