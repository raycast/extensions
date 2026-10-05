import { ActionPanel, Detail } from "@raycast/api";
import { fetchLogs } from "../../actions";
import { usePromise } from "@raycast/utils";
import { resourceToConsoleLink } from "../../util";
import { LogStartTimes } from "../../interfaces";
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
          <ActionPanel.Section title="Copy">
            <AwsAction.ExportResponse response={logs} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default CloudwatchLogs;
