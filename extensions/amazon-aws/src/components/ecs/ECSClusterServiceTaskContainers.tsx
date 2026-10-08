import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { LogStartTimes } from "../../interfaces";
import { fetchTaskContainers, getTaskContainerUrl } from "../../actions";
import { getFilterPlaceholder } from "../../util";
import CloudwatchLogs from "../cloudwatch/CloudwatchLogs";
import CloudwatchLogsTimeDropdown from "../searchbar/CloudwatchLogsTimeDropdown";
import { AwsAction } from "../common/action";

function ECSClusterServiceTaskContainers({ taskDefinitionArn }: { taskDefinitionArn: string }) {
  const [logStartTime, setLogStartTime] = useState<LogStartTimes>(LogStartTimes.OneHour);
  const { data: containers, isLoading } = useCachedPromise(fetchTaskContainers, [taskDefinitionArn], {
    keepPreviousData: true,
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={getFilterPlaceholder("containers")}
      isShowingDetail={true}
      searchBarAccessory={<CloudwatchLogsTimeDropdown logStartTime={logStartTime} onChange={setLogStartTime} />}
    >
      {containers ? (
        containers.map((container) => (
          <List.Item
            key={container.name}
            title={container.name || ""}
            icon={Icon.Box}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={"Name"} text={container.name} />
                    <List.Item.Detail.Metadata.Label title={"CPU"} text={`${container.cpu}`} />
                    <List.Item.Detail.Metadata.Label title={"Memory"} text={`${container.memory}`} />
                    <List.Item.Detail.Metadata.Label title={"Image"} text={container.image} />
                    <List.Item.Detail.Metadata.Label
                      title={"Essential"}
                      text={container.essential ? "true" : "false"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title={"Interactive"}
                      text={container.interactive ? "true" : "false"}
                    />
                    <List.Item.Detail.Metadata.Label title={"Command"} text={container.command?.join(" ")} />
                    <List.Item.Detail.Metadata.Label title={"User"} text={container.user} />
                    <List.Item.Detail.Metadata.Label title={"Working Directory"} text={container.workingDirectory} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={"Health Check Command"}
                      text={container.healthCheck?.command?.join(" ") || ""}
                    />
                    <List.Item.Detail.Metadata.Label
                      title={"Health Check Retries"}
                      text={container.healthCheck?.retries ? container.healthCheck?.retries.toString() : ""}
                    />
                    <List.Item.Detail.Metadata.Label
                      title={"Health Check Timeout"}
                      text={container.healthCheck?.timeout ? container.healthCheck?.timeout.toString() : ""}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {container.logConfiguration?.logDriver === "awslogs" && (
                  <Action.Push
                    title={"View Services"}
                    icon={Icon.Eye}
                    target={
                      <CloudwatchLogs
                        logGroupName={
                          container.logConfiguration?.options
                            ? container.logConfiguration?.options["awslogs-group"]
                            : ""
                        }
                        startTime={logStartTime}
                        logGroupStreamPrefix={
                          container.logConfiguration?.options
                            ? container.logConfiguration?.options["awslogs-stream-prefix"]
                            : ""
                        }
                      />
                    }
                  />
                )}
                <AwsAction.Console url={getTaskContainerUrl(taskDefinitionArn)} />
                <ActionPanel.Section title="Copy">
                  <AwsAction.ExportResponse response={container} />
                  <Action.CopyToClipboard
                    title="Copy Image URL"
                    content={container.image || ""}
                    shortcut={{ modifiers: ["opt"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView title="No containers found" />
      )}
    </List>
  );
}

export default ECSClusterServiceTaskContainers;
