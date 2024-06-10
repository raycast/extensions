import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { AwsAction } from "./components/common/action";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { useLogGroups } from "./hooks/use-logs";
import { formatBytes, resourceToConsoleLink, uniqBy } from "./util";
import { useCachedState } from "@raycast/utils";

export default function CloudWatch() {
  const [prefixQuery, setPrefixQuery] = useState<string>("");
  const [isDetailsEnabled, setDetailsEnabled] = useCachedState<boolean>("show-details", false, {
    cacheNamespace: "aws-logs",
  });
  const { logGroups, error, isLoading, revalidate, pagination } = useLogGroups(prefixQuery);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search log group by name (case-sensitive)..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
      onSearchTextChange={setPrefixQuery}
      isShowingDetail={!isLoading && !error && (logGroups || []).length > 0 && isDetailsEnabled}
      throttle
      pagination={pagination}
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
      {uniqBy(logGroups || [], (logGroup) => logGroup.logGroupName)
        .sort((a, b) => a.logGroupName.localeCompare(b.logGroupName))
        .map((logGroup) => (
          <List.Item
            key={logGroup.groupKey}
            title={logGroup.logGroupName}
            icon="aws-icons/cw/logs.png"
            accessories={
              isDetailsEnabled
                ? []
                : [
                    { date: new Date(logGroup.creationTime), icon: Icon.Calendar, tooltip: "Created" },
                    {
                      tag: { value: formatBytes(logGroup.storedBytes), color: Color.Magenta },
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
                      text={new Date(logGroup.creationTime).toISOString()}
                      icon={Icon.Calendar}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Stored Bytes"
                      text={formatBytes(logGroup.storedBytes)}
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
                <AwsAction.Console url={resourceToConsoleLink(logGroup.logGroupName, "AWS::Logs::LogGroup")} />
                <ActionPanel.Section title={"Logs Actions"}>
                  <Action.CopyToClipboard title="Copy Log Group Name" content={logGroup.logGroupName || ""} />
                  <Action
                    title={`${isDetailsEnabled ? "Hide" : "Show"} Details`}
                    onAction={() => setDetailsEnabled(!isDetailsEnabled)}
                    icon={isDetailsEnabled ? Icon.EyeDisabled : Icon.Eye}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
