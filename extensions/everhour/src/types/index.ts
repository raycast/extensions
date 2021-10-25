export type Project = {
  id: string;
  name: string;
};

export type Task = {
  id: string;
  name: string;
  timeInMin: number;
};

export type TaskResp = {
  id: string;
  name: string;
  time: { total: number };
};

export type TaskTimerResp = {
  status: string;
  task: { name: string };
  timeInMin: number;
};

export type TaskStopTimerResp = {
  status: string;
  taskTime: { task: { name: string } };
  timeInMin: number;
};

export type CurrentTimerResp = {
  status: string;
  task: { id: string };
};
