import { Cluster } from "@aws-sdk/client-ecs";
import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { DefaultAction, Preferences } from "../../interfaces";
import { useCachedPromise } from "@raycast/utils";
import { fetchServices, getClusterUrl } from "../../actions";
import { getActionOpenInBrowser, getActionPush, getExportResponse } from "../../util";
import ECSClusterServices from "./ECSClusterServices";
import { useEffect } from "react";

function ECSCluster({ cluster, setIsLoading }: { cluster: Cluster; setIsLoading: (isLoading: boolean) => void }) {
  const { defaultAction } = getPreferenceValues<Preferences>();
  const { data: services, isLoading } = useCachedPromise(fetchServices, [cluster.clusterArn!], {
    keepPreviousData: true,
  });

  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading]);

  const getActions = () => {
    const actionViewInApp = getActionPush({
      title: "View Services",
      component: ECSClusterServices,
      clusterArn: cluster.clusterArn!,
    });
    const actionViewInBrowser = getActionOpenInBrowser(getClusterUrl(cluster));

    return defaultAction === DefaultAction.OpenInBrowser
      ? [actionViewInBrowser, actionViewInApp]
      : [actionViewInApp, actionViewInBrowser];
  };

  return (
    <List.Item
      id={cluster.clusterArn}
      key={cluster.clusterArn}
      title={cluster.clusterName || ""}
      icon={"aws-icons/ecs.png"}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label key={"Name"} title={"Name"} text={`Active / Pending`} />
              {services?.map((s) => (
                <List.Item.Detail.Metadata.Label
                  key={s.serviceName}
                  title={s.serviceName!}
                  text={`${s.runningCount} / ${s.pendingCount}`}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {getActions()}
          <ActionPanel.Section title="Copy">
            {getExportResponse(cluster)}
            <Action.CopyToClipboard
              title="Copy Cluster ARN"
              content={cluster.clusterArn || ""}
              shortcut={{ modifiers: ["opt"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[{ text: cluster.status }]}
    />
  );
}

export default ECSCluster;
