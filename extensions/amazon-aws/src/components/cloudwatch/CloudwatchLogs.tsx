import { ActionPanel, Detail } from "@raycast/api";
import { fetchLogs, getTaskCWLogsGroupUrl } from "../../actions";
import { usePromise } from "@raycast/utils";
import { getActionOpenInBrowser, getExportResponse } from "../../util";

function CloudwatchLogs({
  logGroupName,
  logGroupStreamPrefix,
  logGroupStreamName,
}: {
  logGroupName: string;
  logGroupStreamPrefix?: string;
  logGroupStreamName?: string;
}) {
  const { data: logs, isLoading } = usePromise(fetchLogs, [
    logGroupName,
    logGroupStreamPrefix,
    logGroupStreamName ? [logGroupStreamName] : undefined,
  ]);
  ``;

  return (
    <Detail
      markdown={logs?.reduce(
        (acc, cur) => `${cur.timestamp ? new Date(cur.timestamp).toLocaleString() : ""}-${cur.message}\n\n${acc}`,
        ""
      )}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {getActionOpenInBrowser(getTaskCWLogsGroupUrl(logGroupName))}
          <ActionPanel.Section title="Copy">{getExportResponse(logs)}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default CloudwatchLogs;
