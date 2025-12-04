import { GlueClient, JobRun, GetJobCommand, StartJobRunCommand, GetJobCommandOutput } from "@aws-sdk/client-glue";
import { Action, ActionPanel, Icon, List, Image, Color, Detail, showToast, Toast } from "@raycast/api";
import { MutatePromise, showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";
import { useGlueJobRuns, useGlueJobs } from "./hooks/use-glue";

export interface GlueJobRun extends JobRun {
  accessoriesText?: string;
  icon?: Icon;
  iconTintColor?: Color;
}

export default function Glue() {
  const [isDetailsEnabled, setDetailsEnabled] = useCachedState<boolean>("show-details", false, {
    cacheNamespace: "aws-glue",
  });
  const { jobs, error, isLoading, mutate } = useGlueJobs();
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter Jobs by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={mutate} />}
      isShowingDetail={!isLoading && !error && isDetailsEnabled}
    >
      {!isLoading && error && <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />}
      {!isLoading && !error && (jobs || []).length === 0 && (
        <List.EmptyView title="No Glue jobs found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {!isLoading &&
        !error &&
        jobs?.map((job) => (
          <GlueJob
            job={job}
            isDetailsEnabled={isDetailsEnabled}
            setDetailsEnabled={setDetailsEnabled}
            mutate={mutate}
          />
        ))}
    </List>
  );
}

function GlueJob({
  job: glueJobRun,
  isDetailsEnabled,
  setDetailsEnabled,
  mutate,
}: {
  job: GlueJobRun;
  isDetailsEnabled: boolean;
  setDetailsEnabled: CallableFunction;
  mutate: MutatePromise<GlueJobRun[] | undefined>;
}) {
  if (!glueJobRun) {
    return null; // or return some placeholder component
  }

  return (
    <List.Item
      key={glueJobRun?.JobName}
      keywords={[glueJobRun?.Id ?? "", glueJobRun?.JobRunState ?? "", glueJobRun?.ErrorMessage ?? ""]}
      icon={{ source: "aws-icons/glue.png", mask: Image.Mask.RoundedRectangle }}
      title={glueJobRun.JobName!}
      detail={<GlueJobRunDetails jobRun={glueJobRun} />}
      actions={
        <ActionPanel>
          <Action.Push
            title="List All Job Runs"
            icon={Icon.List}
            target={<GlueJobRuns glueJobName={glueJobRun.JobName!} />}
          />
          <Action
            title="Start Run"
            onAction={() => RunGlueJob(glueJobRun.JobName!, mutate)}
            icon={Icon.Play}
            shortcut={{ modifiers: ["ctrl"], key: "enter" }}
          />
          <Action.Push
            title="Show Job Definition"
            icon={Icon.Info}
            target={<GlueJobDefinition glueJobName={glueJobRun.JobName!} />}
            shortcut={{ modifiers: ["ctrl"], key: "d" }}
          />
          <Action
            title="Refresh"
            onAction={() => mutate()}
            icon={Icon.RotateAntiClockwise}
            shortcut={{ modifiers: ["ctrl"], key: "r" }}
          />
          <AwsAction.Console url={resourceToConsoleLink(glueJobRun.JobName, "AWS::Glue::JobRuns")} />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Job Name" content={glueJobRun.JobName || ""} />
          </ActionPanel.Section>
          <Action
            title={`${isDetailsEnabled ? "Hide" : "Show"} Details`}
            onAction={() => setDetailsEnabled(!isDetailsEnabled)}
            icon={isDetailsEnabled ? Icon.EyeDisabled : Icon.Eye}
          />
        </ActionPanel>
      }
      accessories={[
        {
          date: glueJobRun.CompletedOn ?? glueJobRun.StartedOn,
          tooltip: glueJobRun.CompletedOn ? "Completed On" : "Started On",
        },
        {
          icon: { source: glueJobRun.icon!, tintColor: glueJobRun.iconTintColor },
          tooltip: glueJobRun.accessoriesText,
        },
      ]}
    />
  );
}

function GlueJobRuns({ glueJobName: glueJobName }: { glueJobName: string }) {
  const { jobRuns, isLoading } = useGlueJobRuns(glueJobName);
  return (
    <List isLoading={isLoading} navigationTitle={`Glue Job Runs of ` + glueJobName} isShowingDetail>
      {jobRuns?.map((jobRun) => (
        <List.Item
          accessories={[
            { date: jobRun.StartedOn, tooltip: "Started On" },
            {
              icon: { source: jobRun.icon!, tintColor: jobRun.iconTintColor },
              tooltip: "Recent Job Run State",
            },
          ]}
          title={jobRun.StartedOn?.toUTCString() || ""}
          detail={<GlueJobRunDetails jobRun={jobRun} />}
          keywords={[jobRun.JobRunState || "", jobRun.ErrorMessage || "", jobRun.Id || ""]}
          actions={
            <ActionPanel>
              <AwsAction.Console url={resourceToConsoleLink(jobRun.JobName, "AWS::Glue::JobRun", jobRun.Id)} />
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
      markdown={
        glueJobRun.Arguments
          ? `**Arguments**\n\`\`\`json\n${JSON.stringify(glueJobRun.Arguments, null, 2)}\n\`\`\``
          : undefined
      }
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Job Name" text={glueJobRun.JobName} />
          <List.Item.Detail.Metadata.Label
            title="Job Run State"
            text={{ value: glueJobRun.JobRunState || "", color: glueJobRun.iconTintColor }}
          />
          <List.Item.Detail.Metadata.Label title="Execution Time" text={glueJobRun.ExecutionTime?.toString() + "s"} />
          <List.Item.Detail.Metadata.Label title="Started on" text={glueJobRun.StartedOn?.toUTCString()} />
          {glueJobRun.CompletedOn && (
            <List.Item.Detail.Metadata.Label title="Completed On" text={glueJobRun.CompletedOn?.toUTCString()} />
          )}
          {glueJobRun.ErrorMessage && (
            <List.Item.Detail.Metadata.Label
              title="Error Message"
              text={{ color: Color.Red, value: glueJobRun.ErrorMessage || "" }}
            />
          )}
          <List.Item.Detail.Metadata.Label title="Arguments" text={JSON.stringify(glueJobRun.Arguments)} />
          {glueJobRun.DPUSeconds && (
            <List.Item.Detail.Metadata.Label title="DPU Seconds" text={glueJobRun.DPUSeconds?.toString() + "s"} />
          )}
          {glueJobRun.Attempt && (
            <List.Item.Detail.Metadata.Label title="Attempt" text={glueJobRun.Attempt?.toString()} />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Worker Type" text={glueJobRun.WorkerType} />
          {glueJobRun.WorkerType && (
            <List.Item.Detail.Metadata.Label title="Number of Workers" text={glueJobRun.NumberOfWorkers?.toString()} />
          )}
          {glueJobRun.Timeout && (
            <List.Item.Detail.Metadata.Label title="Timeout" text={glueJobRun.Timeout?.toString() + "s"} />
          )}
          {glueJobRun.ProfileName && (
            <List.Item.Detail.Metadata.Label title="Profile Name" text={glueJobRun.ProfileName} />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Versions">
            <List.Item.Detail.Metadata.TagList.Item text={"Glue V" + glueJobRun.GlueVersion} color={Color.Yellow} />
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
        `___\n**Job Definition**\n` +
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
          {glueJobDetails?.Job && <Detail.Metadata.Label title="Role" text={glueJobDetails?.Job?.Role} />}
          {glueJobDetails?.Job?.LastModifiedOn && (
            <Detail.Metadata.Label title="LastModifiedOn" text={glueJobDetails?.Job?.LastModifiedOn?.toISOString()} />
          )}
          {glueJobDetails?.Job?.WorkerType && (
            <Detail.Metadata.Label title="WorkerType" text={glueJobDetails?.Job?.WorkerType} />
          )}
          {glueJobDetails?.Job?.ExecutionProperty?.MaxConcurrentRuns && (
            <Detail.Metadata.Label
              title="MaxConcurrentRuns"
              text={glueJobDetails?.Job?.ExecutionProperty?.MaxConcurrentRuns?.toString()}
            />
          )}
          {glueJobDetails?.Job?.MaxCapacity && (
            <Detail.Metadata.Label title="MaxCapacity" text={glueJobDetails?.Job?.MaxCapacity?.toString()} />
          )}
          {glueJobDetails?.Job?.NumberOfWorkers && (
            <Detail.Metadata.Label title="NumerOfWorkers" text={glueJobDetails?.Job?.NumberOfWorkers?.toString()} />
          )}
          {glueJobDetails?.Job?.Timeout && (
            <Detail.Metadata.Label title="Timeout" text={glueJobDetails?.Job?.Timeout?.toString()} />
          )}
          <Detail.Metadata.Separator />
          {glueJobDetails?.Job?.CreatedOn && (
            <Detail.Metadata.Label title="CreatedOn" text={glueJobDetails?.Job?.CreatedOn?.toISOString()} />
          )}
          {glueJobDetails?.Job?.GlueVersion && (
            <Detail.Metadata.Label title="GlueVersion" text={glueJobDetails?.Job?.GlueVersion?.toString()} />
          )}
          {glueJobDetails?.Job?.Command && (
            <Detail.Metadata.Label title="PythonVersion" text={glueJobDetails?.Job?.Command?.PythonVersion} />
          )}
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
