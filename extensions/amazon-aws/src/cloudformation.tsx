import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import {
  CloudFormationClient,
  DescribeStacksCommand,
  Export,
  ListExportsCommand,
  ListStackResourcesCommand,
  ListStacksCommand,
  StackResourceSummary,
  StackSummary,
  UpdateTerminationProtectionCommand,
} from "@aws-sdk/client-cloudformation";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { isReadyToFetch, resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";

export default function CloudFormation() {
  const [isExportsEnabled, setExportsEnabled] = useCachedState<boolean>("aws-cfn-exports-enabled", false);

  if (isExportsEnabled) {
    return <CloudFormationExports setExportsEnabled={setExportsEnabled} />;
  }
  return <CloudFormationStacks setExportsEnabled={setExportsEnabled} />;
}

const CloudFormationStacks = ({ setExportsEnabled }: { setExportsEnabled: (value: boolean) => void }) => {
  const { data: stacks, error, isLoading, revalidate } = useCachedPromise(fetchStacks);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter stacks by name, status or description..."
      filtering
      navigationTitle="CloudFormation Stacks"
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && stacks?.length === 0 && (
        <List.EmptyView title="No stacks found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {stacks?.map((s) => (
        <List.Item
          key={s.StackId}
          keywords={[s.StackName || "", s.StackStatus || "", s.TemplateDescription || ""]}
          icon={"aws-icons/cfn/stack.png"}
          title={s.StackName || ""}
          subtitle={s.TemplateDescription}
          actions={
            <ActionPanel>
              <AwsAction.Console url={resourceToConsoleLink(s.StackId, "AWS::CloudFormation::Stack")} />
              <ActionPanel.Section title="Stack Actions">
                <Action.Push
                  icon={Icon.Eye}
                  title="Show Stack Resources"
                  target={<CloudFormationStackResources stack={s} />}
                  shortcut={{ modifiers: ["ctrl"], key: "r" }}
                />
                <Action
                  icon={Icon.LockUnlocked}
                  title="Update Termination Protection"
                  shortcut={{ modifiers: ["ctrl"], key: "t" }}
                  onAction={() => updateTerminationProtection(s.StackName || "")}
                />
                <Action.CopyToClipboard title="Copy Stack ID" content={s.StackId || ""} />
                <Action.CopyToClipboard title="Copy Stack Name" content={s.StackName || ""} />
              </ActionPanel.Section>
              <ActionPanel.Section title="Other Resources">
                <Action.Push
                  icon={Icon.Eye}
                  title={"Show Exports"}
                  target={<CloudFormationExports revalidateStacks={revalidate} setExportsEnabled={setExportsEnabled} />}
                  onPush={() => setExportsEnabled(true)}
                  shortcut={{ modifiers: ["ctrl"], key: "e" }}
                />
              </ActionPanel.Section>
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
  const { data: resources, error, isLoading } = useCachedPromise(fetchStackResources, [stack.StackName || ""]);

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

const CloudFormationExports = ({
  revalidateStacks,
  setExportsEnabled,
}: {
  revalidateStacks?: () => void;
  setExportsEnabled: (value: boolean) => void;
}) => {
  const { data: exports, isLoading, revalidate, error } = useCachedPromise(fetchExports, []);
  const { push, pop } = useNavigation();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter exports by name, value or stack..."
      filtering
      navigationTitle="CloudFormation Exports"
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && exports?.length === 0 && (
        <List.EmptyView title="No exports found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {exports?.map((e) => (
        <List.Item
          key={e.Name}
          icon={{ source: Icon.Hashtag, tintColor: Color.Purple }}
          title={e.Value || ""}
          subtitle={e.Name}
          keywords={[e.Name || "", e.ExportingStackId || "", e.Value || ""]}
          accessories={[{ tag: e.ExportingStackId?.split("/")[1] }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Export Name" content={e.Name || ""} />
              <Action.CopyToClipboard title="Copy Export Value" content={e.Value || ""} />
              <ActionPanel.Section title="Resource Types">
                <Action
                  icon={Icon.Eye}
                  title="Show Stacks"
                  onAction={() => {
                    pop();
                    if (revalidateStacks) {
                      revalidateStacks();
                    } else {
                      push(<CloudFormationStacks setExportsEnabled={setExportsEnabled} />);
                    }
                    setExportsEnabled(false);
                  }}
                  shortcut={{ modifiers: ["ctrl"], key: "s" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

const fetchStacks = async (token?: string, stacks?: StackSummary[]): Promise<StackSummary[]> => {
  if (!isReadyToFetch()) return [];
  const { NextToken, StackSummaries } = await new CloudFormationClient({}).send(
    new ListStacksCommand({ NextToken: token }),
  );

  const combinedStacks = [...(stacks || []), ...(StackSummaries || [])];

  if (NextToken) {
    return fetchStacks(NextToken, combinedStacks);
  }

  return combinedStacks.filter((stack) => stack.StackStatus !== "DELETE_COMPLETE");
};

const fetchStackResources = async (
  stackName: string,
  token?: string,
  stacks?: StackResourceSummary[],
): Promise<StackResourceSummary[]> => {
  const { StackResourceSummaries, NextToken } = await new CloudFormationClient({}).send(
    new ListStackResourcesCommand({ StackName: stackName, NextToken: token }),
  );

  if (NextToken) {
    return fetchStackResources(stackName, NextToken, [...(stacks || []), ...(StackResourceSummaries || [])]);
  }

  return [...(stacks || []), ...(StackResourceSummaries || [])];
};

const fetchExports = async (token?: string, exports?: Export[]): Promise<Export[]> => {
  const { Exports, NextToken } = await new CloudFormationClient({}).send(new ListExportsCommand({ NextToken: token }));

  if (NextToken) {
    return fetchExports(NextToken, [...(exports || []), ...(Exports || [])]);
  }

  return [...(exports || []), ...(Exports || [])];
};

const updateTerminationProtection = async (stackName: string) => {
  const { Stacks } = await new CloudFormationClient({}).send(new DescribeStacksCommand({ StackName: stackName }));
  const terminationProtection = !Stacks![0].EnableTerminationProtection;

  await confirmAlert({
    title: `${terminationProtection ? "Enable" : "Disable"} Termination Protection?`,
    message: `Are you sure you want to ${terminationProtection ? "enable" : "disable"} termination protection?`,
    icon: { source: Icon.Exclamationmark3, tintColor: Color.Red },
    primaryAction: {
      title: terminationProtection ? "Enable" : "Disable",
      style: terminationProtection ? Alert.ActionStyle.Default : Alert.ActionStyle.Destructive,
      onAction: async () => {
        await showToast({
          style: Toast.Style.Animated,
          title: `${terminationProtection ? "Enabling" : "Disabling"} Termination Protection...`,
        });
        try {
          await new CloudFormationClient({}).send(
            new UpdateTerminationProtectionCommand({
              EnableTerminationProtection: terminationProtection,
              StackName: stackName,
            }),
          );
          await showToast({
            style: Toast.Style.Success,
            title: `${terminationProtection ? "Enabled" : "Disabled"} Termination Protection`,
          });
        } catch (error) {
          await showFailureToast(error, { title: "Failed to update termination protection" });
        }
      },
    },
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
