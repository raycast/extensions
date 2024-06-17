import { GlueClient, ListJobsCommand } from "@aws-sdk/client-glue";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import CloudwatchLogStreams from "./components/cloudwatch/CloudwatchLogStreams";
import { isReadyToFetch, resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";

export default function GlueJobs() {
  const { data: functions, error, isLoading, revalidate } = useCachedPromise(fetchJobs);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter Jobs by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        functions?.map((func) => <GlueFunction key={func} func={func} />)
      )}
    </List>
  );
}

function GlueFunction({ func: glueJobName }: { func: string }) {
  return (
    <List.Item
      key={glueJobName}
      icon={"aws-icons/glue.png"}
      title={glueJobName || ""}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(glueJobName, "AWS::Glue::JobRuns")} />
          <Action.OpenInBrowser
            icon={Icon.Document}
            title="Open CloudWatch Log Group"
            url={resourceToConsoleLink(`/aws/lambda/${glueJobName}`, "AWS::Logs::LogGroup")}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          <Action.Push
            title={"View Log Streams"}
            icon={Icon.Eye}
            shortcut={{ modifiers: ["opt"], key: "l" }}
            target={<CloudwatchLogStreams logGroupName={`/aws/lambda/${glueJobName}`}></CloudwatchLogStreams>}
          />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Function ARN" content={glueJobName} />
            <Action.CopyToClipboard title="Copy Function Name" content={glueJobName || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[{ text: glueJobName || "" }]}
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
