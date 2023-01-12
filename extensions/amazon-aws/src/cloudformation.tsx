import { ActionPanel, List, Action, Icon } from "@raycast/api";
import {
  CloudFormationClient,
  ListStackResourcesCommand,
  ListStacksCommand,
  StackResourceSummary,
  StackStatus,
  StackSummary,
} from "@aws-sdk/client-cloudformation";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";

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
      icon={"aws-icons/cfo.png"}
      title={stack.StackName || ""}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Eye}
            title="Resources"
            target={<CloudFormationStackResources stackName={stack.StackName || ""} />}
          />
          <Action.OpenInBrowser
            title="Open in Browser"
            url={resourceToConsoleLink(stack.StackId, "AWS::CloudFormation::Stack")}
          />
          <Action.CopyToClipboard title="Copy Stack ID" content={stack.StackId || ""} />
        </ActionPanel>
      }
      accessories={[{ icon: iconMap[stack.StackStatus as StackStatus], tooltip: stack.StackStatus }]}
    />
  );
}

function CloudFormationStackResources({ stackName }: { stackName: string }) {
  const { data: resources } = useCachedPromise(fetchStackResources, [stackName]);

  return (
    <List>
      {resources?.map((r) => {
        const consoleLink = resourceToConsoleLink(r.PhysicalResourceId, r.ResourceType || "");

        return (
          <List.Item
            id={r.PhysicalResourceId}
            key={r.PhysicalResourceId}
            title={r.PhysicalResourceId || ""}
            accessories={[{ text: r.ResourceType }, { icon: consoleLink ? Icon.Link : undefined }]}
            actions={
              <ActionPanel>
                {consoleLink && <Action.OpenInBrowser title="Open in Browser" url={consoleLink} />}
                <Action.CopyToClipboard title="Copy Resource ID" content={r.PhysicalResourceId || ""} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

async function fetchStacks(token?: string, stacks?: StackSummary[]): Promise<StackSummary[]> {
  if (!process.env.AWS_PROFILE) return [];
  const { NextToken, StackSummaries } = await new CloudFormationClient({}).send(
    new ListStacksCommand({ NextToken: token })
  );

  const combinedStacks = [...(stacks || []), ...(StackSummaries || [])];

  if (NextToken) {
    return fetchStacks(NextToken, combinedStacks);
  }

  return combinedStacks.filter((stack) => stack.StackStatus !== "DELETE_COMPLETE");
}

async function fetchStackResources(
  stackName: string,
  token?: string,
  stacks?: StackResourceSummary[]
): Promise<StackResourceSummary[]> {
  const { StackResourceSummaries, NextToken } = await new CloudFormationClient({}).send(
    new ListStackResourcesCommand({ StackName: stackName, NextToken: token })
  );

  if (NextToken) {
    return fetchStackResources(stackName, NextToken, [...(stacks || []), ...(StackResourceSummaries || [])]);
  }

  return [...(stacks || []), ...(StackResourceSummaries || [])];
}

const iconMap: Record<StackStatus, Icon> = {
  CREATE_COMPLETE: Icon.CheckCircle,
  CREATE_FAILED: Icon.ExclamationMark,
  CREATE_IN_PROGRESS: Icon.CircleProgress50,
  DELETE_COMPLETE: Icon.CheckCircle,
  DELETE_FAILED: Icon.ExclamationMark,
  DELETE_IN_PROGRESS: Icon.CircleProgress50,
  ROLLBACK_COMPLETE: Icon.CheckCircle,
  ROLLBACK_FAILED: Icon.ExclamationMark,
  ROLLBACK_IN_PROGRESS: Icon.CircleProgress50,
  UPDATE_COMPLETE: Icon.CheckCircle,
  UPDATE_COMPLETE_CLEANUP_IN_PROGRESS: Icon.CircleProgress50,
  UPDATE_IN_PROGRESS: Icon.CircleProgress50,
  UPDATE_ROLLBACK_COMPLETE: Icon.CheckCircle,
  UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS: Icon.CircleProgress50,
  UPDATE_ROLLBACK_FAILED: Icon.ExclamationMark,
  UPDATE_ROLLBACK_IN_PROGRESS: Icon.CircleProgress50,
  REVIEW_IN_PROGRESS: Icon.CircleProgress50,
  IMPORT_COMPLETE: Icon.CheckCircle,
  IMPORT_IN_PROGRESS: Icon.CircleProgress50,
  IMPORT_ROLLBACK_COMPLETE: Icon.CheckCircle,
  IMPORT_ROLLBACK_FAILED: Icon.ExclamationMark,
  IMPORT_ROLLBACK_IN_PROGRESS: Icon.CircleProgress50,
  UPDATE_FAILED: Icon.ExclamationMark,
};
