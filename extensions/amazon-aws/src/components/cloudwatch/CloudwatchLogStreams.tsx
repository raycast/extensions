import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { runAppleScript, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { fetchLogStreams } from "../../actions";
import { getAWSErrorMessage } from "../../errors";
import { LogStartTimes } from "../../interfaces";
import { getFilterPlaceholder, resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";
import CloudwatchLogsTimeDropdown from "../searchbar/CloudwatchLogsTimeDropdown";
import CloudwatchLogs from "./CloudwatchLogs";

function CloudwatchLogStreams({ logGroupName }: { logGroupName: string }) {
  const [logStartTime, setLogStartTime] = useState<LogStartTimes>(LogStartTimes.OneHour);
  const {
    data: streams,
    isLoading,
    revalidate,
  } = useCachedPromise(fetchLogStreams, [logGroupName], { keepPreviousData: true });

  const AWS_REGION = process.env.AWS_REGION;
  const liveTailUrl = `https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:live-tail$3FlogGroupArns$3D${encodeURIComponent(`arn:aws:logs:${AWS_REGION}:*:log-group:${logGroupName}`)}`;
  const tailCommand = `aws logs tail "${logGroupName}" --follow`;

  async function runTailInTerminal() {
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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={getFilterPlaceholder("stream")}
      searchBarAccessory={<CloudwatchLogsTimeDropdown logStartTime={logStartTime} onChange={setLogStartTime} />}
      navigationTitle={streams ? `${streams.length} streams` : "Loading..."}
    >
      {streams ? (
        streams.map((s) => (
          <List.Item
            key={s.logStreamName}
            title={s.logStreamName || ""}
            icon={"aws-icons/cw.png"}
            actions={
              <ActionPanel>
                <Action.Push
                  key={"view"}
                  title={"View Logs"}
                  icon={Icon.Eye}
                  target={
                    <CloudwatchLogs
                      logGroupName={logGroupName}
                      startTime={logStartTime}
                      logGroupStreamName={s.logStreamName || ""}
                    />
                  }
                />
                <AwsAction.Console url={resourceToConsoleLink(logGroupName, "AWS::Logs::LogGroup")} />
                <ActionPanel.Section title="Tail Logs">
                  <Action.OpenInBrowser
                    icon={Icon.Livestream}
                    title="Tail Logs in Console"
                    url={liveTailUrl}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                  />
                  <Action
                    title="Run Tail Command in Terminal"
                    icon={Icon.Terminal}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                    onAction={runTailInTerminal}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Stream ARN"
                    content={s.arn || ""}
                    shortcut={{ modifiers: ["opt"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Tail Command"
                    content={tailCommand}
                    icon={Icon.Terminal}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <AwsAction.ExportResponse response={s} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            accessories={[
              {
                text: s.lastEventTimestamp ? new Date(s.lastEventTimestamp).toLocaleString() : "",
                tooltip: "Last Event Timestamp",
              },
            ]}
          />
        ))
      ) : (
        <List.EmptyView />
      )}
    </List>
  );
}

export default CloudwatchLogStreams;
