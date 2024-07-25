import {
  GlueClient,
  ListJobsCommand,
  GetJobRunsCommand,
  JobRun,
  GetJobCommand,
  StartJobRunCommand,
  GetJobCommandOutput,
} from "@aws-sdk/client-glue";
import { Action, ActionPanel, Icon, List, Image, Color, Detail, showToast, Toast } from "@raycast/api";
import { MutatePromise, showFailureToast, useCachedPromise } from "@raycast/utils";
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
  const {
    data: glueJobRuns,
    isLoading: isLoadingJobRuns,
    mutate: mutateJobRuns,
  } = useCachedPromise(fetchJobRuns, [1, glueJobs]);

  return (
    <List
      isLoading={isLoading || isLoadingJobRuns}
      searchBarPlaceholder="Filter Jobs by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={mutate} />}
      isShowingDetail={!isLoading && !error}
    >
      if (error)
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        glueJobRuns?.map((job) => <GlueJob job={job} mutate={mutateJobRuns} />)
      )}
    </List>
  );
}

function GlueJob({ job: glueJobRun, mutate }: { job: GlueJobRun; mutate: MutatePromise<GlueJobRun[] | undefined> }) {
  return (
    <List.Item
      key={glueJobRun.JobName}
      icon={{ source: "aws-icons/glue.png", mask: Image.Mask.RoundedRectangle }}
      title={glueJobRun.JobName || ""}
      detail={<GlueJobRunDetails jobRun={glueJobRun} />}
      actions={
        <ActionPanel>
          <Action.Push
            title="List all Job Runs"
            icon={Icon.List}
            target={<GlueJobRuns glueJobName={glueJobRun.JobName!} />}
          />
          <Action title="Start Run" onAction={() => RunGlueJob(glueJobRun.JobName!, mutate)} icon={Icon.Play} />
          <Action.Push
            title="Show Job Definition"
            icon={Icon.Info}
            target={<GlueJobDefinition glueJobName={glueJobRun.JobName!} />}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action
            title="Refresh"
            onAction={() =>
              mutate(fetchJobRuns(1, [glueJobRun.JobName!]), {
                optimisticUpdate(data) {
                  return data;
                },
              })
            }
            icon={Icon.RotateAntiClockwise}
          />
          <AwsAction.Console url={resourceToConsoleLink(glueJobRun.JobName, "AWS::Glue::JobRuns")} />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Job Name" content={glueJobRun.JobName || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        { date: glueJobRun.CompletedOn, tooltip: "Completed On" },
        {
          text: glueJobRun.accessoriesText,
          icon: { source: glueJobRun.icon!, tintColor: glueJobRun.iconTintColor },
          tooltip: "Recent Job Run State",
        },
      ]}
    />
  );
}

function GlueJobRuns({ glueJobName: glueJobName }: { glueJobName: string }) {
  const { data: glueJobRuns, isLoading: isLoadingJobRuns } = useCachedPromise(fetchJobRuns, [25, [glueJobName]]);
  return (
    <List isLoading={isLoadingJobRuns} navigationTitle={`Glue Job Runs of ` + glueJobName} isShowingDetail>
      {glueJobRuns?.map((jobRun) => (
        <List.Item
          accessories={[
            { date: jobRun.CompletedOn, tooltip: "Completed On" },
            {
              text: jobRun.accessoriesText,
              icon: { source: jobRun.icon!, tintColor: jobRun.iconTintColor },
              tooltip: "Recent Job Run State",
            },
          ]}
          title={jobRun.CompletedOn?.toUTCString() || ""}
          detail={<GlueJobRunDetails jobRun={jobRun} />}
          actions={
            <ActionPanel>
              <AwsAction.Console url={resourceToConsoleLink(jobRun.Id, "AWS::Glue::JobRun")} />
              <ActionPanel.Section title={"Copy"}>
                <Action.CopyToClipboard title="Copy Job Run Id" content={jobRun.Id || ""} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function GlueJobRunDetails({ jobRun: glueJobRun }: { jobRun: GlueJobRun }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Job Name" text={glueJobRun.JobName} />
          <List.Item.Detail.Metadata.Label
            title="Job Run State"
            text={{ value: glueJobRun.JobRunState || "", color: glueJobRun.iconTintColor }}
          />
          <List.Item.Detail.Metadata.Label title="Execution Time" text={glueJobRun.ExecutionTime?.toString() + "s"} />
          <List.Item.Detail.Metadata.Label title="Started on" text={glueJobRun.StartedOn?.toUTCString()} />
          <List.Item.Detail.Metadata.Label title="Completed On" text={glueJobRun.CompletedOn?.toUTCString() || ""} />
          <List.Item.Detail.Metadata.Label
            title="Error Message"
            text={{ color: Color.Red, value: glueJobRun.ErrorMessage || "" }}
          />
          <List.Item.Detail.Metadata.Label title="Arguments" text={JSON.stringify(glueJobRun.Arguments)} />
          <List.Item.Detail.Metadata.Label title="DPU Seconds" text={(glueJobRun.DPUSeconds?.toString() || "") + "s"} />
          <List.Item.Detail.Metadata.Label title="Attempt" text={glueJobRun.Attempt?.toString()} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Worker Type" text={glueJobRun.WorkerType} />
          <List.Item.Detail.Metadata.Label title="Number of Workers" text={glueJobRun.NumberOfWorkers?.toString()} />
          <List.Item.Detail.Metadata.Label title="Timeout" text={glueJobRun.Timeout?.toString() + "s"} />
          <List.Item.Detail.Metadata.Label title="Profile Name" text={glueJobRun.ProfileName || ""} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Versions">
            <List.Item.Detail.Metadata.TagList.Item text={"Glue V" + glueJobRun.GlueVersion} color={"#eed535"} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Log Group Name" text={glueJobRun.LogGroupName} />
          <List.Item.Detail.Metadata.Label title="Id" text={glueJobRun.Id} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

async function RunGlueJob(glueJobName: string, mutate: MutatePromise<GlueJobRun[] | undefined>) {
  mutate(new GlueClient({}).send(new StartJobRunCommand({ JobName: glueJobName })), {
    optimisticUpdate(data) {
      return data;
    },
  })
    .then((response) => {
      showToast({ style: Toast.Style.Success, title: "Triggered Glue job", message: "JobRunId: " + response.JobRunId });
    })
    .catch((error) => {
      showFailureToast(error, { title: "Unable to trigger Glue Job" });
    });
}

function GlueJobDefinition({ glueJobName: glueJobName }: { glueJobName: string }) {
  const { data: glueJobDetails, isLoading } = useCachedPromise(fetchJobDetails, [glueJobName]);
  const description = glueJobDetails?.Job?.Description
    ? glueJobDetails?.Job?.Description!.toString()
    : `No Descrtiption`;
  return (
    <Detail
      navigationTitle="Glue Job Definition"
      markdown={
        `# ` +
        glueJobName +
        `\n\n` +
        description +
        `\n\n` +
        `___\n## Job Definition\n` +
        `\`\`\`json\n` +
        JSON.stringify(glueJobDetails?.Job, null, 2) +
        `\`\`\``
      }
      isLoading={isLoading}
      actions={
        <ActionPanel title="title">
          <AwsAction.Console url={resourceToConsoleLink(glueJobDetails?.Job?.Name, "AWS::Glue::JobRuns")} />
          <Action.CopyToClipboard content={JSON.stringify(glueJobDetails?.Job?.Name)} title="Copy Job Name" />
          <Action.CopyToClipboard
            content={JSON.stringify(glueJobDetails?.Job?.DefaultArguments)}
            title="Copy Default Arguments"
          />
          <Action.CopyToClipboard content={JSON.stringify(glueJobDetails?.Job)} title="Copy Job Definition" />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Role" text={glueJobDetails?.Job?.Role} />
          <Detail.Metadata.Label title="LastModifiedOn" text={glueJobDetails?.Job?.LastModifiedOn?.toISOString()} />
          <Detail.Metadata.Label title="WorkerType" text={glueJobDetails?.Job?.WorkerType} />
          <Detail.Metadata.Label
            title="MaxConcurrentRuns"
            text={glueJobDetails?.Job?.ExecutionProperty?.MaxConcurrentRuns?.toString()}
          />
          <Detail.Metadata.Label title="MaxCapacity" text={glueJobDetails?.Job?.MaxCapacity?.toString()} />
          <Detail.Metadata.Label title="NumerOfWorkers" text={glueJobDetails?.Job?.NumberOfWorkers?.toString()} />
          <Detail.Metadata.Label title="Timeout" text={glueJobDetails?.Job?.Timeout?.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="CreatedOn" text={glueJobDetails?.Job?.CreatedOn?.toISOString()} />
          <Detail.Metadata.Label title="GlueVersion" text={glueJobDetails?.Job?.GlueVersion?.toString()} />
          <Detail.Metadata.Label title="PythonVersion" text={glueJobDetails?.Job?.Command?.PythonVersion} />
          <Detail.Metadata.Label
            title="Default Arguments"
            text={JSON.stringify(glueJobDetails?.Job?.DefaultArguments)}
          />
          <Detail.Metadata.Label title="JobMode" text={glueJobDetails?.Job?.JobMode} />
        </Detail.Metadata>
      }
    />
  );
}

async function fetchJobDetails(glueJobName: string): Promise<GetJobCommandOutput> {
  const client = new GlueClient({});
  const input = {
    JobName: glueJobName, // required
  };
  const command = new GetJobCommand(input);
  const response: GetJobCommandOutput = await client.send(command);

  return response;
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

async function fetchJobRuns(maxResults: number, jobNames?: string[]): Promise<GlueJobRun[]> {
  // The function should return only the latest job run result per job.
  if (!isReadyToFetch() && jobNames) return [];
  const jobRuns: JobRun[] = [];
  for (const jobName of jobNames!) {
    const { JobRuns: jobRunsResponses } = await new GlueClient({}).send(
      new GetJobRunsCommand({ JobName: jobName, MaxResults: maxResults }),
    );

    jobRunsResponses?.map((jobRun) => {
      const jobRunResponse: GlueJobRun = jobRun;
      if (jobRun.JobRunState === "FAILED") {
        jobRunResponse.icon = Icon.XMarkCircle;
        jobRunResponse.iconTintColor = Color.Red;
        jobRunResponse.accessoriesText = jobRun.ErrorMessage;
      } else if (jobRun.JobRunState === "RUNNING") {
        jobRunResponse.icon = Icon.Clock;
        jobRunResponse.iconTintColor = Color.Yellow;
        jobRunResponse.accessoriesText = jobRun.JobRunState;
      } else if (jobRun.JobRunState === "SUCCEEDED") {
        jobRunResponse.icon = Icon.CheckCircle;
        jobRunResponse.iconTintColor = Color.Green;
      } else {
        jobRunResponse.icon = Icon.QuestionMark;
        jobRunResponse.iconTintColor = Color.SecondaryText;
        jobRunResponse.accessoriesText = "Unknown state";
      }
      jobRuns.push(jobRunResponse);
    });
  }
  return jobRuns;
}
