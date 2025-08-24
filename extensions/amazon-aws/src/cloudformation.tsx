import {
  Action,
  ActionPanel,
  Alert,
  captureException,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  Clipboard,
  Keyboard,
} from "@raycast/api";
import {
  CloudFormationClient,
  DescribeStacksCommand,
  StackSummary,
  UpdateTerminationProtectionCommand,
} from "@aws-sdk/client-cloudformation";
import { useCachedState, useFrecencySorting } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { getErrorMessage, resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";
import { useExports, useStackResources, useStacks } from "./hooks/use-cfn";

enum ResourceType {
  Stacks = "Stacks",
  Exports = "Exports",
}
type SetResourceType = { setResourceType: (value: ResourceType) => void };

export default function CloudFormation() {
  const [resourceType, setResourceType] = useCachedState<ResourceType>("resource-type", ResourceType.Stacks, {
    cacheNamespace: "aws-cfn",
  });

  if (resourceType === ResourceType.Exports) {
    return <CloudFormationExports {...{ setResourceType }} />;
  }
  return <CloudFormationStacks {...{ setResourceType }} />;
}

const CloudFormationStacks = ({ setResourceType }: SetResourceType) => {
  const { stacks, error, isLoading, mutate } = useStacks();

  const {
    data: sortedStacks,
    visitItem: visit,
    resetRanking,
  } = useFrecencySorting(stacks, {
    namespace: "aws-cfn-stacks",
    key: (stack) => stack.StackName!,
    sortUnvisited: (a, b) => a.StackName!.localeCompare(b.StackName!),
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter stacks by name, status or description..."
      filtering
      navigationTitle="CloudFormation Stacks"
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={mutate} />}
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && sortedStacks.length === 0 && (
        <List.EmptyView title="No stacks found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {sortedStacks.map((s) => (
        <List.Item
          key={s.StackId}
          keywords={[s.StackName || "", s.StackStatus || "", s.TemplateDescription || ""]}
          icon={"aws-icons/cfn/stack.png"}
          title={s.StackName || ""}
          subtitle={s.TemplateDescription}
          actions={
            <ActionPanel>
              <AwsAction.Console
                url={resourceToConsoleLink(s.StackId, "AWS::CloudFormation::Stack")}
                onAction={() => visit(s)}
              />
              <ActionPanel.Section title="Stack Actions">
                <Action.Push
                  icon={Icon.Eye}
                  title="Show Stack Resources"
                  target={<CloudFormationStackResources stack={s} />}
                  shortcut={{ modifiers: ["ctrl"], key: "r" }}
                  onPush={() => visit(s)}
                />
                <Action
                  icon={Icon.LockUnlocked}
                  title="Update Termination Protection"
                  shortcut={{ modifiers: ["ctrl"], key: "t" }}
                  onAction={async () => {
                    await visit(s);
                    await updateTerminationProtection(s.StackName || "");
                  }}
                />
                <Action.CopyToClipboard title="Copy Stack ID" content={s.StackId || ""} onCopy={() => visit(s)} />
                <Action.CopyToClipboard title="Copy Stack Name" content={s.StackName || ""} onCopy={() => visit(s)} />
                <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(s)} />
              </ActionPanel.Section>
              <AwsAction.SwitchResourceType
                {...{ setResourceType, current: ResourceType.Stacks, enumType: ResourceType }}
              />
            </ActionPanel>
          }
          accessories={[
            { date: s.CreationTime, icon: Icon.Calendar, tooltip: "Creation Time" },
            { icon: statusToIcon(s.StackStatus || ""), tooltip: s.StackStatus },
          ]}
        />
      ))}
    </List>
  );
};

const CloudFormationStackResources = ({ stack }: { stack: StackSummary }) => {
  const { resources, error, isLoading } = useStackResources(stack.StackName || "");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter resource by name, type or status..."
      filtering
      navigationTitle="Stack Resources"
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {resources?.map((r) => {
        const consoleLink = resourceToConsoleLink(r.PhysicalResourceId, r.ResourceType || "");

        return (
          <List.Item
            key={r.LogicalResourceId}
            icon={{ source: consoleLink ? Icon.Link : Icon.Tag, tintColor: Color.Blue }}
            title={r.PhysicalResourceId || ""}
            subtitle={r.ResourceType}
            keywords={[r.PhysicalResourceId || "", r.ResourceType || "", r.ResourceStatus || ""]}
            accessories={[
              { date: r.LastUpdatedTimestamp, icon: Icon.Calendar, tooltip: "Last Modified" },
              { icon: statusToIcon(r.ResourceStatus || ""), tooltip: r.ResourceStatus },
            ]}
            actions={
              <ActionPanel>
                {consoleLink && <AwsAction.Console url={consoleLink} />}
                <Action.CopyToClipboard title="Copy Resource ID" content={r.PhysicalResourceId || ""} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

const CloudFormationExports = ({ setResourceType }: SetResourceType) => {
  const { exports, isLoading, error, mutate } = useExports();

  const {
    data: sortedExports,
    visitItem: visit,
    resetRanking,
  } = useFrecencySorting(exports, {
    namespace: "aws-cfn-exports",
    key: (e) => e.Name!,
    sortUnvisited: (a, b) => a.Name!.localeCompare(b.Name!),
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter exports by name, value or stack..."
      filtering
      navigationTitle="CloudFormation Exports"
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={mutate} />}
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && sortedExports.length === 0 && (
        <List.EmptyView title="No exports found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {sortedExports.map((e) => (
        <List.Item
          key={e.Name}
          icon={{ source: Icon.Hashtag, tintColor: Color.Purple }}
          title={e.Value!}
          subtitle={e.Name}
          keywords={[e.Name || "", e.ExportingStackId || "", e.Value || ""]}
          accessories={[{ tag: e.ExportingStackId?.split("/")[1] }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard title="Copy Export Name" content={e.Name || ""} onCopy={() => visit(e)} />
                <Action.CopyToClipboard title="Copy Export Value" content={e.Value || ""} onCopy={() => visit(e)} />
                <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(e)} />
              </ActionPanel.Section>
              <AwsAction.SwitchResourceType
                {...{ setResourceType, current: ResourceType.Exports, enumType: ResourceType }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

const updateTerminationProtection = async (stackName: string) => {
  const toast = await showToast({ style: Toast.Style.Animated, title: `⏳ Getting stack details for ${stackName}` });
  new CloudFormationClient({})
    .send(new DescribeStacksCommand({ StackName: stackName }))
    .then(async ({ Stacks }) => {
      const terminationProtection = !Stacks![0].EnableTerminationProtection;
      await confirmAlert({
        title: `${terminationProtection ? "Enable" : "Disable"} Termination Protection?`,
        message: `Are you sure you want to ${terminationProtection ? "enable" : "disable"} termination protection?`,
        icon: { source: Icon.Exclamationmark3, tintColor: Color.Red },
        primaryAction: {
          title: terminationProtection ? "Enable" : "Disable",
          style: terminationProtection ? Alert.ActionStyle.Default : Alert.ActionStyle.Destructive,
          onAction: async () => {
            toast.title = `⏳ ${terminationProtection ? "Enabling" : "Disabling"} Termination Protection`;
            new CloudFormationClient({})
              .send(
                new UpdateTerminationProtectionCommand({
                  EnableTerminationProtection: terminationProtection,
                  StackName: stackName,
                }),
              )
              .then(() => {
                toast.style = Toast.Style.Success;
                toast.title = `${terminationProtection ? "Enabled" : "Disabled"} Termination Protection`;
              })
              .catch((err) => {
                captureException(err);
                toast.style = Toast.Style.Failure;
                toast.title = `❌ Failed to ${terminationProtection ? "enable" : "disable"} termination protection`;
                toast.message = getErrorMessage(err);
                toast.primaryAction = {
                  title: "Retry",
                  shortcut: Keyboard.Shortcut.Common.Refresh,
                  onAction: () => updateTerminationProtection(stackName),
                };
                toast.secondaryAction = {
                  title: "Copy Error",
                  shortcut: Keyboard.Shortcut.Common.Copy,
                  onAction: () => Clipboard.copy(getErrorMessage(err)),
                };
              });
          },
        },
        dismissAction: { title: "Cancel", onAction: () => toast.hide() },
      });
    })
    .catch((err) => {
      captureException(err);
      toast.style = Toast.Style.Failure;
      toast.title = `❌ Failed to get stack details for ${stackName}`;
      toast.message = getErrorMessage(err);
      toast.primaryAction = {
        title: "Retry",
        shortcut: Keyboard.Shortcut.Common.Refresh,
        onAction: () => updateTerminationProtection(stackName),
      };
      toast.secondaryAction = {
        title: "Copy Error",
        shortcut: Keyboard.Shortcut.Common.Copy,
        onAction: () => Clipboard.copy(getErrorMessage(err)),
      };
    });
};

const statusToIcon = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.endsWith("complete") && statusLower.includes("rollback")) {
    return { source: Icon.Warning, tintColor: Color.Orange };
  }
  if (statusLower.endsWith("complete")) {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
  if (statusLower.endsWith("failed")) {
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
  if (statusLower.endsWith("in_progress")) {
    return { source: Icon.CircleProgress50, tintColor: Color.Blue };
  }
  return { source: Icon.Warning, tintColor: Color.Orange };
};
