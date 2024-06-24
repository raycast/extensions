import { GlueClient, ListJobsCommand } from "@aws-sdk/client-glue";
import { Action, ActionPanel, Icon, List, Image } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { isReadyToFetch, resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";

export default function Glue() {
  const { data: glueJobs, error, isLoading, mutate } = useCachedPromise(fetchJobs);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter Jobs by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={mutate} />}
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
      icon={{ source: "aws-icons/glue.png", mask: Image.Mask.RoundedRectangle }}
      title={glueJobName || ""}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(glueJobName, "AWS::Glue::JobRuns")} />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Job Name" content={glueJobName || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
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
