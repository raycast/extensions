import { getPreferenceValues, ActionPanel, List, OpenInBrowserAction, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import * as AWS from "aws-sdk";
import { Preferences } from "./types";
import { StackSummary } from "aws-sdk/clients/cloudformation";
import setupAws from "./util/setupAws";

setupAws();

export default function ListStacks() {
  const preferences: Preferences = getPreferenceValues();
  const cloudformation = new AWS.CloudFormation({ apiVersion: "2016-11-15" });

  const [state, setState] = useState<{
    stacks: StackSummary[];
    loaded: boolean;
    hasError: boolean;
  }>({
    stacks: [],
    loaded: false,
    hasError: false,
  });

  useEffect(() => {
    if (!preferences.region) return;
    async function fetchStacks(token?: string, stacks?: StackSummary[]): Promise<StackSummary[]> {
      const { NextToken, StackSummaries } = await cloudformation.listStacks({ NextToken: token }).promise();
      const combinedStacks = [...(stacks || []), ...(StackSummaries || [])];

      if (NextToken) {
        return fetchStacks(NextToken, combinedStacks);
      }

      return combinedStacks.filter((stack) => stack.StackStatus !== "DELETE_COMPLETE");
    }

    fetchStacks()
      .then((stacks) => setState({ hasError: false, loaded: true, stacks }))
      .catch(() => setState({ hasError: true, loaded: false, stacks: [] }));
  }, []);

  if (state.hasError) {
    return (
      <Detail markdown="No valid [configuration and credential file](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) found in your machine." />
    );
  }

  return (
    <List isLoading={!state.loaded} searchBarPlaceholder="Filter stacks by name...">
      {state.stacks.map((s) => (
        <CloudFormationStack key={s.StackId} stack={s} />
      ))}
    </List>
  );
}

function CloudFormationStack({ stack }: { stack: StackSummary }) {
  const preferences: Preferences = getPreferenceValues();

  return (
    <List.Item
      id={stack.StackName}
      key={stack.StackId}
      title={stack.StackName}
      accessoryTitle={stack.LastUpdatedTime ? new Date(stack.LastUpdatedTime).toLocaleString() : undefined}
      actions={
        <ActionPanel>
          <OpenInBrowserAction
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
    />
  );
}
