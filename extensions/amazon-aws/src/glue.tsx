import { GlueClient, ListJobsCommand, GetJobRunsCommand, JobRun } from "@aws-sdk/client-glue";
import { Action, ActionPanel, Icon, List, Image, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { isReadyToFetch, resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";

interface GlueJobRun extends JobRun {
  accessoriesText?: string;
  icon?: Icon;
  iconTintColor?: Color;
}

export default function Glue() {
  const { data: glueJobs, error, isLoading, mutate } = useCachedPromise(fetchJobs);
  const { data: glueJobRuns, isLoading: isLoadingJobRuns } = useCachedPromise(fetchJobRuns, [glueJobs]);

  return (
    <List
      isLoading={isLoading || isLoadingJobRuns}
      searchBarPlaceholder="Filter Jobs by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={mutate} />}
    >
      if (error)
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        glueJobRuns?.map((job) => <GlueJob key={job.JobName} job={job} />)
      )}
    </List>
  );
}

function GlueJob({ job: glueJobRun }: { job: GlueJobRun }) {
  return (
    <List.Item
      key={glueJobRun.JobName}
      icon={{ source: "aws-icons/glue.png", mask: Image.Mask.RoundedRectangle }}
      title={glueJobRun.JobName || ""}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(glueJobRun.JobName, "AWS::Glue::JobRuns")} />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Job Name" content={glueJobRun.JobName || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        { date: glueJobRun.CompletedOn, tooltip: "Completed On" },
        {
          tag: glueJobRun.accessoriesText,
          icon: { source: glueJobRun.icon, tintColor: glueJobRun.iconTintColor },
          tooltip: "Recent Job Run State",
        },
      ]}
    />
  );
}

async function fetchJobs(nextMarker?: string, jobs?: string[]): Promise<string[]> {
  if (!isReadyToFetch()) return [];
  const { NextToken, JobNames } = await new GlueClient({}).send(new ListJobsCommand({ NextToken: nextMarker }));

  const combinedJobs = [...(jobs || []), ...(JobNames || [])];

  if (NextToken) {
    return fetchJobs(NextToken, combinedJobs);
  }

  return combinedJobs;
}
async function fetchJobRuns(jobNames?: string[]): Promise<JobRun[]> {
  // The function should return only the latest job run result per job.
  // TODO: what happens when there is no job run?
  if (!isReadyToFetch() && jobNames) return [];
  const jobRuns: JobRun[] = [];
  for (const jobName of jobNames!) {
    const { JobRuns: jobRunsResponse } = await new GlueClient({}).send(
      new GetJobRunsCommand({ JobName: jobName, MaxResults: 1 }),
    );
    if (jobRunsResponse && jobRunsResponse.length > 0) {
      const jobRunResponse: GlueJobRun = jobRunsResponse![0];
      if (jobRunResponse.JobRunState === "FAILED") {
        jobRunResponse.icon = Icon.XMarkCircle;
        jobRunResponse.iconTintColor = Color.Red;
        jobRunResponse.accessoriesText = jobRunResponse.ErrorMessage;
      } else if (jobRunResponse.JobRunState === "RUNNING") {
        jobRunResponse.icon = Icon.Clock;
        jobRunResponse.iconTintColor = Color.Yellow;
        jobRunResponse.accessoriesText = jobRunResponse.JobRunState;
      } else if (jobRunResponse.JobRunState === "SUCCEEDED") {
        jobRunResponse.icon = Icon.CheckCircle;
        jobRunResponse.iconTintColor = Color.Green;
      } else {
        jobRunResponse.icon = Icon.QuestionMark;
        jobRunResponse.iconTintColor = Color.SecondaryText;
        jobRunResponse.accessoriesText = "Unknown state";
      }
      jobRuns.push(jobRunResponse);
    }
  }

  return jobRuns;
}
