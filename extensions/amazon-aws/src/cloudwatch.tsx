import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { runAppleScript, useCachedState, useFrecencySorting } from "@raycast/utils";
import { LogGroup } from "@aws-sdk/client-cloudwatch-logs";
import { AwsAction } from "./components/common/action";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { getAWSErrorMessage } from "./errors";
import { useLogGroups } from "./hooks/use-logs";
import { formatBytes, resourceToConsoleLink } from "./util";

function getLiveTailUrl(logGroupName: string) {
  const region = process.env.AWS_REGION;
  return `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:live-tail$3FlogGroupArns$3D${encodeURIComponent(`arn:aws:logs:${region}:*:log-group:${logGroupName}`)}`;
}

function getTailCommand(logGroupName: string) {
  return `aws logs tail "${logGroupName}" --follow`;
}

async function runTailInTerminal(logGroupName: string) {
  const tailCommand = getTailCommand(logGroupName);
  const escapedCommand = tailCommand.replace(/"/g, '\\"');
  const appleScript = `
    tell application "Terminal"
      do script "${escapedCommand}"
      activate
    end tell
  `;
  try {
    await runAppleScript(appleScript);
    await showToast({ style: Toast.Style.Success, title: "Opened in Terminal" });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Terminal",
      message: getAWSErrorMessage(error),
    });
  }
}

export default function CloudWatch() {
  const [isDetailsEnabled, setDetailsEnabled] = useCachedState<boolean>("show-details", false, {
    cacheNamespace: "aws-logs",
  });
  const { logGroups, error, isLoading, mutate } = useLogGroups();

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
      searchBarPlaceholder="Filter log groups..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={mutate} />}
      isShowingDetail={!isLoading && !error && (logGroups || []).length > 0 && isDetailsEnabled}
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
              <ActionPanel.Section title="Tail Logs">
                <Action.OpenInBrowser
                  icon={Icon.Livestream}
                  title="Tail Logs in Console"
                  url={getLiveTailUrl(logGroup.logGroupName!)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                />
                <Action
                  title="Run Tail Command in Terminal"
                  icon={Icon.Terminal}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  onAction={() => runTailInTerminal(logGroup.logGroupName!)}
                />
                <Action.CopyToClipboard
                  title="Copy Tail Command"
                  content={getTailCommand(logGroup.logGroupName!)}
                  icon={Icon.Terminal}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Logs Actions">
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
