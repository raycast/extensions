import {
  GlueClient,
  ListJobsCommand,
  GetJobRunsCommand,
  JobRun,
  GetJobCommand,
  StartJobRunCommand,
  GetJobCommandOutput,
  JobMode,
} from "@aws-sdk/client-glue";
import { Action, ActionPanel, Icon, List, Image, Color, Detail, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import {
  CodePipelineClient,
  GetPipelineStateCommand,
  ListPipelineExecutionsCommand,
  ListPipelinesCommand,
} from "@aws-sdk/client-codepipeline";

import {
  GlueClient,
  GetJobRunsCommand,
  ListJobsCommand,
} from "@aws-sdk/client-glue";
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
      return (JobRuns ?? []).map((run) => ({
        ...run,
        JobRunId: run.Id,
      })) as GlueJobRun[];
    },
    [jobName],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load Glue job runs" } },
  );

  return { jobRuns, isLoading: (!jobRuns && !error) || isLoading, mutate };
};

const fetchGlueJobs = async (toast: Toast, nextToken?: string, aggregate?: GlueJobRun[]): Promise<GlueJobRun[]> => {
  const { JobNames: jobNames, NextToken: cursor } = await new GlueClient({}).send(
    new ListJobsCommand({ NextToken: nextToken, MaxResults: 5 }),
  );

  const jobs = await Promise.all(
    (jobNames ?? [])
      .map(async (jobName) => {
        const { JobRuns } = await new GlueClient({}).send(
          new GetJobRunsCommand({ JobName: jobName, MaxResults: 1 }),
        );

        const latestRun = JobRuns && JobRuns.length > 0 ? JobRuns[0] : undefined;
        // return { jobName: jobName, lastestRun: latestRun } as LastestJobRun;
        return latestRun as GlueJobRun
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
