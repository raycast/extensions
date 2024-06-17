import { GlueClient, ListJobsCommand } from "@aws-sdk/client-glue";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { isReadyToFetch, resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";

export default function GlueJobs() {
  const { data: glueJobs, error, isLoading, revalidate } = useCachedPromise(fetchJobs);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter Jobs by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        glueJobs?.map((job) => <GlueJob key={job} job={job} />)
      )}
    </List>
  );
}

function GlueJob({ job: glueJobName }: { job: string }) {
  return (
    <List.Item
      key={glueJobName}
      icon={"aws-icons/glue.png"}
      title={glueJobName || ""}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(glueJobName, "AWS::Glue::JobRuns")} />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Job Name" content={glueJobName || ""} />
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
