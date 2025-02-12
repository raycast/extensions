import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchLogStreams } from "../../actions";
import { getFilterPlaceholder, resourceToConsoleLink } from "../../util";
import { LogStartTimes } from "../../interfaces";
import CloudwatchLogs from "./CloudwatchLogs";
import CloudwatchLogsTimeDropdown from "../searchbar/CloudwatchLogsTimeDropdown";
import { AwsAction } from "../common/action";

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
