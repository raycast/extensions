import { useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchLogStreams, getTaskCWLogsGroupUrl } from "../../actions";
import { getActionOpenInBrowser, getActionPush, getFilterPlaceholder } from "../../util";
import { LogStartTimes } from "../../interfaces";
import CloudwatchLogs from "./CloudwatchLogs";
import CloudwatchLogsTimeDropdown from "../searchbar/CloudwatchLogsTimeDropdown";

function CloudwatchLogStreams({ logGroupName }: { logGroupName: string }) {
  const [logStartTime, setLogStartTime] = useState<LogStartTimes>(LogStartTimes.OneHour);
  const { data: streams, isLoading } = useCachedPromise(fetchLogStreams, [logGroupName], { keepPreviousData: true });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={getFilterPlaceholder("stream")}
      searchBarAccessory={<CloudwatchLogsTimeDropdown logStartTime={logStartTime} onChange={setLogStartTime} />}
    >
      {streams ? (
        streams.map((s) => (
          <List.Item
            id={s.logStreamName}
            key={s.logStreamName}
            title={s.logStreamName || ""}
            icon={"aws-icons/cw.png"}
            actions={
              <ActionPanel>
                {[
                  getActionPush({
                    title: "View Logs",
                    component: CloudwatchLogs,
                    logGroupName,
                    startTime: logStartTime,
                    logStreamNames: s.logStreamName ?? undefined,
                  }),
                  getActionOpenInBrowser(getTaskCWLogsGroupUrl(logGroupName)),
                ]}
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Stream ARN"
                    content={s.arn || ""}
                    shortcut={{ modifiers: ["opt"], key: "c" }}
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
