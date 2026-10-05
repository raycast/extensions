export type CronJob = {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  active: boolean;
  nodename?: string | null;
  nodeport?: number | null;
  database?: string | null;
  username?: string | null;
};

export type JobRunDetail = {
  runid: number;
  jobid: number;
  jobname?: string | null;
  job_pid: number;
  database: string;
  username: string;
  command: string;
  status: string;
  return_message: string;
  start_time: string;
  end_time: string;
};

export type FetchMode = "view" | "rpc";

export type JobStatus = "running" | "success" | "failed" | "unknown";

export type CronJobWithRun = CronJob & {
  lastRun?: JobRunDetail | null;
  lastRunFetchError?: string | null;
};
