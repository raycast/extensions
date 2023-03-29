import { CloudWatchLogsClient, DescribeLogGroupsCommand, LogGroup } from "@aws-sdk/client-cloudwatch-logs";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";

export default function CloudWatch() {
  const [search, setSearch] = useState<string>("");
  const { data: logGroups, error, isLoading, revalidate } = useCachedPromise(fetchLogGroups, [search]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter log groups by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
      onSearchTextChange={setSearch}
      throttle
    >
      {search.length < 4 ? (
        <List.EmptyView
          title="Missing Search Query"
          icon={Icon.MagnifyingGlass}
          description="The search will begin when at least 4 characters are provided."
        />
      ) : error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        logGroups?.map((logGroup) => <LogGroupEntry key={logGroup.logGroupName} logGroup={logGroup} />)
      )}
    </List>
  );
}

function LogGroupEntry({ logGroup }: { logGroup: LogGroup }) {
  return (
    <List.Item
      icon={"aws-icons/cw.png"}
      title={logGroup.logGroupName || ""}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Log Group"
            url={resourceToConsoleLink(logGroup.logGroupName, "AWS::Logs::LogGroup")}
          />
          <Action.CopyToClipboard title="Copy Log Group Name" content={logGroup.logGroupName || ""} />
        </ActionPanel>
      }
    />
  );
}

async function fetchLogGroups(search: string, token?: string, accLogGroups?: LogGroup[]): Promise<LogGroup[]> {
  if (search.length < 4) return [];
  if (!process.env.AWS_PROFILE) return [];

  const { nextToken, logGroups } = await new CloudWatchLogsClient({}).send(
    new DescribeLogGroupsCommand({ nextToken: token, logGroupNamePattern: search || undefined })
  );

  const combinedLogGroups = [...(accLogGroups || []), ...(logGroups || [])];

  if (nextToken) {
    return fetchLogGroups(search, nextToken, combinedLogGroups);
  }

  return combinedLogGroups;
}
