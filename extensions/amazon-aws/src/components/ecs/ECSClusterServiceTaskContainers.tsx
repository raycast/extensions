import { ContainerDefinition } from "@aws-sdk/client-ecs";
import { DefaultAction, LogStartTimes, Preferences } from "../../interfaces";
import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { fetchTaskContainers, getTaskContainerUrl } from "../../actions";
import { getActionOpenInBrowser, getActionPush, getExportResponse, getFilterPlaceholder } from "../../util";
import { useCachedPromise } from "@raycast/utils";
import CloudwatchLogs from "../cloudwatch/CloudwatchLogs";
import { useState } from "react";
import CloudwatchLogsTimeDropdown from "../searchbar/CloudwatchLogsTimeDropdown";

function ECSClusterServiceTaskContainers({ taskDefinitionArn }: { taskDefinitionArn: string }) {
  const { defaultAction } = getPreferenceValues<Preferences>();
  const [logStartTime, setLogStartTime] = useState<LogStartTimes>(LogStartTimes.OneHour);
  const { data: containers, isLoading } = useCachedPromise(fetchTaskContainers, [taskDefinitionArn], {
    keepPreviousData: true,
  });

  const getActions = (container: ContainerDefinition) => {
    const actionViewInApp = getActionPush({
      title: "View Logs",
      component: CloudwatchLogs,
      logGroupName: container.logConfiguration?.options ? container.logConfiguration?.options["awslogs-group"] : "",
      startTime: logStartTime,
      logGroupStreamPrefix: container.logConfiguration?.options
        ? container.logConfiguration?.options["awslogs-stream-prefix"]
        : "",
    });
    const actionViewInBrowser = getActionOpenInBrowser(getTaskContainerUrl(taskDefinitionArn));

    let containerActions =
      defaultAction === DefaultAction.OpenInBrowser
        ? [actionViewInBrowser, actionViewInApp]
        : [actionViewInApp, actionViewInBrowser];

    if (container.logConfiguration?.logDriver !== "awslogs") {
      containerActions = containerActions.filter((action) => action.key !== "logs");
    }
    return containerActions;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={getFilterPlaceholder("containers")}
      isShowingDetail={true}
      searchBarAccessory={<CloudwatchLogsTimeDropdown onChange={setLogStartTime} />}
    >
      {containers ? (
        containers.map((container) => (
          <List.Item
            id={container.name}
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
                {getActions(container)}
                <ActionPanel.Section title="Copy">
                  {getExportResponse(container)}
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
