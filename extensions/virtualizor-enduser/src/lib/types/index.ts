type Common = {
  act: string;
  timezone: string;
  timenow: string;
  preferences: {
    theme: string;
    language: string;
    timezone: string;
    default_enduser_timezone: string;
  };
  url: "index.php?";
  rdns: {
    pdnsid: string | null;
  };
  enable_2fa?: 0 | 1;
  disable_recipes: 0 | 1;
  check_licensepro: boolean;
  counts?: {
    vps: string;
    users: string;
    ssh_keys: string;
    api: string;
    euiso: string;
    lb: string;
    recipes: string;
  };
  title: string;
  time_taken: string;
};
export type CommonResponse = Common & {
  uid: string;
  vpsid: string;
  username: string;
  user_type: string;
};

type Log = {
  actid: string;
  uid: string;
  vpsid: string;
  action: string;
  data: string;
  time: string;
  status: "0" | "1";
  ip: string;
  email: string | null;
  action_text: string;
};
export type LogsResponse = {
  logs: {
    [key: string]: Log;
  };
};

export type Task = {
  actid: string;
  slaveactid: string;
  uid: string;
  vpsid: string;
  serid: number;
  action: string | null;
  data: string;
  time: string;
  status_txt: string;
  status: string;
  progress: string;
  started: string;
  updated: string;
  ended: string;
  proc_id: string;
  ip: string;
  internal: string;
  email: string;
  progress_num: string;
  notupdated_task: number;
  server_name: string;
};

type Page = {
  start: number;
  len: number;
  maxNum: string;
};

export type MessageResponse = {
  done: {
    msg: string;
    goto?: string;
    vpsid: string;
  };
  status?: number;
  output: string;
} & {
  [key: string]: {
    done: 1;
    done_msg: string;
  };
};
export type SuccessResponse<T> = CommonResponse & T;
export type SuccessPaginatedResponse<T> = CommonResponse & { [key: string]: { [id: string]: T } } & { page: Page };
export type ErrorResponse =
  | (CommonResponse & {
      error: string[];
      status?: number;
      output: null;
    })
  | (Common & {
      uid: -1;
      vpsid: 0;
      username: null;
      user_type: null;
    });
