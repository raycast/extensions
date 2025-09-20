import { Service } from "@aws-sdk/client-ecs";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { fetchTasks, getTaskUrl } from "../../actions";
import { useCachedPromise } from "@raycast/utils";
import { getFilterPlaceholder } from "../../util";
import ECSClusterServiceTaskContainers from "./ECSClusterServiceTaskContainers";
import { AwsAction } from "../common/action";

function ECSClusterServiceTasks({ service }: { service: Service }) {
  const { data: tasks, isLoading } = useCachedPromise(
    fetchTasks,
    [service.clusterArn || "", service.serviceName || ""],
    {
      keepPreviousData: true,
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder={getFilterPlaceholder("tasks", "id")} isShowingDetail={true}>
      {tasks ? (
        tasks.map((task) => (
          <List.Item
            key={task.taskDefinitionArn}
            title={task.taskArn?.split("/").pop() || ""}
            icon={Icon.Box}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      key={"heading"}
                      title={"Container Name"}
                      text={`Status | Exit Code | CPU | Memory`}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    {task.containers?.map((c) => (
                      <List.Item.Detail.Metadata.Label
                        key={c.name}
                        title={c.name || ""}
                        text={`${c.healthStatus} | ${c.exitCode ? c.exitCode : "Running"} | ${c.cpu} | ${c.memory}`}
                      />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title={"View Containers"}
                  icon={Icon.Eye}
                  target={<ECSClusterServiceTaskContainers taskDefinitionArn={task.taskDefinitionArn || ""} />}
                />
                <AwsAction.Console url={getTaskUrl(task)} />
                <ActionPanel.Section title="Copy">
                  <AwsAction.ExportResponse response={task} />
                  <Action.CopyToClipboard
                    title="Copy Task ARN"
                    content={task.taskArn || ""}
                    shortcut={{ modifiers: ["opt"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView title="No Tasks Found" />
      )}
    </List>
  );
}

export default ECSClusterServiceTasks;
