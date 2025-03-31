import { Icon, Color, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";

import { GlueClient, GetJobRunsCommand, ListJobsCommand } from "@aws-sdk/client-glue";
import { GlueJobRun } from "../glue";

export const useGlueJobs = () => {
  const {
    data: jobs,
    isLoading,
    mutate,
    error,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading Glue jobs" });
      return await fetchGlueJobs(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load Glue jobs" } },
  );

  return { jobs, isLoading: (!jobs && !error) || isLoading, error, mutate };
};

export const useGlueJobRuns = (jobName: string) => {
  const {
    data: jobRuns,
    error,
    isLoading,
    mutate,
  } = useCachedPromise(
    async (name: string) => {
      const { JobRuns } = await new GlueClient({}).send(new GetJobRunsCommand({ JobName: name }));
      return (JobRuns ?? []).map((run) => {
        const jobRunResponse = {
          ...run,
          JobRunId: run.Id,
        } as GlueJobRun;

        if (jobRunResponse) {
          setJobRunIcon(jobRunResponse);
        }

        return jobRunResponse;
      });
    },
    [jobName],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load Glue job runs" } },
  );

  return { jobRuns, isLoading: (!jobRuns && !error) || isLoading, mutate };
};

const fetchGlueJobs = async (toast: Toast, nextToken?: string, aggregate?: GlueJobRun[]): Promise<GlueJobRun[]> => {
  const { JobNames: jobNames, NextToken: cursor } = await new GlueClient({}).send(
    new ListJobsCommand({ NextToken: nextToken, MaxResults: 25 }),
  );

  const jobs = await Promise.all(
    (jobNames ?? []).map(async (jobName) => {
      const { JobRuns } = await new GlueClient({}).send(new GetJobRunsCommand({ JobName: jobName, MaxResults: 1 }));

      const latestRun = JobRuns && JobRuns.length > 0 ? JobRuns[0] : undefined;
      const jobRunResponse = latestRun as GlueJobRun;
      if (jobRunResponse) {
        setJobRunIcon(jobRunResponse);
      }
      return jobRunResponse;
    }),
  );

  const agg = [...(aggregate ?? []), ...jobs];
  toast.message = `${agg.length} Glue jobs`;
  if (cursor) {
    return await fetchGlueJobs(toast, cursor, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded Glue jobs";
  toast.message = `${agg.length} Glue jobs`;
  return agg;
};

const setJobRunIcon = (jobRun: GlueJobRun) => {
  switch (jobRun.JobRunState) {
    case "FAILED":
      jobRun.icon = Icon.XMarkCircle;
      jobRun.iconTintColor = Color.Red;
      jobRun.accessoriesText = jobRun.ErrorMessage;
      break;
    case "RUNNING":
      jobRun.icon = Icon.Hourglass;
      jobRun.iconTintColor = Color.Blue;
      jobRun.accessoriesText = jobRun.JobRunState;
      break;
    case "SUCCEEDED":
      jobRun.icon = Icon.CheckCircle;
      jobRun.iconTintColor = Color.Green;
      break;
    default:
      jobRun.icon = Icon.QuestionMark;
      jobRun.iconTintColor = Color.SecondaryText;
      jobRun.accessoriesText = "Unknown state";
  }
};
