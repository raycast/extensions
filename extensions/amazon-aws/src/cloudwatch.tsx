import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { AwsAction } from "./components/common/action";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { useLogGroups } from "./hooks/use-logs";
import { formatBytes, resourceToConsoleLink } from "./util";
import { useCachedState, useFrecencySorting } from "@raycast/utils";
import { LogGroup } from "@aws-sdk/client-cloudwatch-logs";

export default function CloudWatch() {
  const [prefixQuery, setPrefixQuery] = useState<string>("");
  const [isDetailsEnabled, setDetailsEnabled] = useCachedState<boolean>("show-details", false, {
    cacheNamespace: "aws-logs",
  });
  const { logGroups, error, isLoading, mutate } = useLogGroups(prefixQuery);

  const {
    data: sortedLogGroups,
    resetRanking,
    visitItem: visit,
  } = useFrecencySorting(logGroups, {
    namespace: "aws-logs-sort",
    key: (logGroup: LogGroup) => logGroup.logGroupName!,
    sortUnvisited: (a, b) => a.logGroupName!.localeCompare(b.logGroupName!),
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search log group by name prefix (>2 characters)"
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={mutate} />}
      onSearchTextChange={setPrefixQuery}
      isShowingDetail={!isLoading && !error && (logGroups || []).length > 0 && isDetailsEnabled}
      throttle
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && logGroups?.length === 0 && (
        <List.EmptyView title="No queues found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {sortedLogGroups.map((logGroup) => (
        <List.Item
          key={logGroup.logGroupArn!}
          title={logGroup.logGroupName!}
          icon="aws-icons/cw/logs.png"
          accessories={
            isDetailsEnabled
              ? []
              : [
                  { date: new Date(logGroup.creationTime!), icon: Icon.Calendar, tooltip: "Created" },
                  {
                    tag: { value: formatBytes(logGroup.storedBytes!), color: Color.Magenta },
                    tooltip: "Stored Bytes",
                    icon: Icon.Snippets,
                  },
                ]
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Log Group Name" text={logGroup.logGroupName} />
                  <List.Item.Detail.Metadata.Label title="Log Group ARN" text={logGroup.logGroupArn} />
                  <List.Item.Detail.Metadata.Label
                    title="Creation Date"
                    text={new Date(logGroup.creationTime!).toISOString()}
                    icon={Icon.Calendar}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Stored Bytes"
                    text={formatBytes(logGroup.storedBytes!)}
                    icon={{ source: Icon.Snippets, tintColor: Color.Magenta }}
                  />
                  {logGroup.retentionInDays && (
                    <List.Item.Detail.Metadata.Label
                      title="Retention"
                      text={`${logGroup.retentionInDays} Days`}
                      icon={{ source: Icon.Clock, tintColor: Color.Orange }}
                    />
                  )}
                  {logGroup.dataProtectionStatus && (
                    <List.Item.Detail.Metadata.Label title="Data Protection" text={logGroup.dataProtectionStatus} />
                  )}
                  {logGroup.logGroupClass && (
                    <List.Item.Detail.Metadata.Label title="Log Group Class" text={logGroup.logGroupClass} />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <AwsAction.Console
                url={resourceToConsoleLink(logGroup.logGroupName, "AWS::Logs::LogGroup")}
                onAction={() => visit(logGroup)}
              />
              <ActionPanel.Section title={"Logs Actions"}>
                <Action.CopyToClipboard
                  title="Copy Log Group Name"
                  content={logGroup.logGroupName || ""}
                  onCopy={() => visit(logGroup)}
                />
                <Action
                  title={`${isDetailsEnabled ? "Hide" : "Show"} Details`}
                  onAction={() => setDetailsEnabled(!isDetailsEnabled)}
                  icon={isDetailsEnabled ? Icon.EyeDisabled : Icon.Eye}
                />
                <Action
                  title="Reset Ranking"
                  icon={Icon.ArrowCounterClockwise}
                  onAction={() => resetRanking(logGroup)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
