import { ActionPanel, List, Detail, Action } from "@raycast/api";
import * as AWS from "aws-sdk";
import { StackSummary } from "aws-sdk/clients/cloudformation";
import setupAws from "./util/setupAws";
import { useCachedPromise } from "@raycast/utils";

const preferences = setupAws();
const cloudformation = new AWS.CloudFormation({ apiVersion: "2016-11-15" });

export default function ListStacks() {
  const { data: stacks, error, isLoading } = useCachedPromise(fetchStacks);

  if (error) {
    return (
      <Detail markdown="No valid [configuration and credential file](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) found in your machine." />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter stacks by name...">
      {stacks?.map((s) => (
        <CloudFormationStack key={s.StackId} stack={s} />
      ))}
    </List>
  );
}

function CloudFormationStack({ stack }: { stack: StackSummary }) {
  return (
    <List.Item
      id={stack.StackName}
      key={stack.StackId}
      icon="cloudformation-icon.png"
      title={stack.StackName}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={
              "https://console.aws.amazon.com/cloudformation/home?region=" +
              preferences.region +
              "#/stacks/stackinfo?stackId=" +
              stack.StackId
            }
          />
        </ActionPanel>
      }
      accessories={[
        {
          text: stack.LastUpdatedTime
            ? new Date(stack.LastUpdatedTime).toLocaleString()
            : new Date(stack.CreationTime).toLocaleString(),
        },
      ]}
    />
  );
}

async function fetchStacks(token?: string, stacks?: StackSummary[]): Promise<StackSummary[]> {
  const { NextToken, StackSummaries } = await cloudformation.listStacks({ NextToken: token }).promise();
  const combinedStacks = [...(stacks || []), ...(StackSummaries || [])];

  if (NextToken) {
    return fetchStacks(NextToken, combinedStacks);
  }

  return combinedStacks.filter((stack) => stack.StackStatus !== "DELETE_COMPLETE");
}
