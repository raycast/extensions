import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { CloudFormationClient, ListStacksCommand, StackSummary } from "@aws-sdk/client-cloudformation";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./util/aws-profile-dropdown";

export default function CloudFormation() {
  const { data: stacks, error, isLoading, revalidate } = useCachedPromise(fetchStacks);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter stacks by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        stacks?.map((s) => <CloudFormationStack key={s.StackId} stack={s} />)
      )}
    </List>
  );
}

function CloudFormationStack({ stack }: { stack: StackSummary }) {
  return (
    <List.Item
      id={stack.StackName}
      key={stack.StackId}
      icon="cloudformation.png"
      title={stack.StackName || ""}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={
              "https://console.aws.amazon.com/cloudformation/home?region=" +
              process.env.AWS_REGION +
              "#/stacks/stackinfo?stackId=" +
              stack.StackId
            }
          />
        </ActionPanel>
      }
      accessories={[{ date: stack.LastUpdatedTime || stack.CreationTime }]}
    />
  );
}

async function fetchStacks(token?: string, stacks?: StackSummary[]): Promise<StackSummary[]> {
  const { NextToken, StackSummaries } = await new CloudFormationClient({}).send(
    new ListStacksCommand({ NextToken: token })
  );

  const combinedStacks = [...(stacks || []), ...(StackSummaries || [])];

  if (NextToken) {
    return fetchStacks(NextToken, combinedStacks);
  }

  return combinedStacks.filter((stack) => stack.StackStatus !== "DELETE_COMPLETE");
}
