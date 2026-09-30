export type ListCronJobsResponse = {
  [key: string]: {
    MIN: string;
    HOUR: string;
    DAY: string;
    MONTH: string;
    WDAY: string;
    CMD: string;
    JOB: string;
    SUSPENDED: "yes" | "no";
    TIME: string;
    DATE: string;
  };
};

export type AddCronJobRequest = {
  user: string;
  minute: string;
  hour: string;
  day: string;
  month: string;
  weekday: string;
  command: string;
};
export type AddCronJobFormValues = AddCronJobRequest;
