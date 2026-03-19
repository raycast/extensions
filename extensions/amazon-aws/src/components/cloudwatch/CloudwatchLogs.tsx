import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { runAppleScript, usePromise } from "@raycast/utils";
import { fetchLogs } from "../../actions";
import { getAWSErrorMessage } from "../../errors";
import { LogStartTimes } from "../../interfaces";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";

function CloudwatchLogs({
  logGroupName,
  startTime,
  logGroupStreamPrefix,
  logGroupStreamName,
}: {
  logGroupName: string;
  startTime: LogStartTimes;
  logGroupStreamPrefix?: string;
  logGroupStreamName?: string;
}) {
  const { data: logs, isLoading } = usePromise(fetchLogs, [
    logGroupName,
    startTime,
    logGroupStreamPrefix,
    logGroupStreamName ? [logGroupStreamName] : undefined,
  ]);

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
    <Detail
      markdown={logs?.reduce(
        (acc, cur) => `${cur.timestamp ? new Date(cur.timestamp).toLocaleString() : ""}-${cur.message}\n\n${acc}`,
        "",
      )}
      isLoading={isLoading}
      actions={
        <ActionPanel>
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
            <AwsAction.ExportResponse response={logs} />
            <Action.CopyToClipboard
              title="Copy Tail Command"
              content={tailCommand}
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default CloudwatchLogs;
