import { Cluster } from "@aws-sdk/client-ecs";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchServices, getClusterUrl } from "../../actions";
import { getActionOpenInBrowser, getExportResponse } from "../../util";
import ECSClusterServices from "./ECSClusterServices";

function ECSCluster({ cluster }: { cluster: Cluster }) {
  const { data: services, isLoading } = useCachedPromise(fetchServices, [cluster.clusterArn ?? ""], {
    keepPreviousData: true,
  });

  return (
    <List.Item
      id={cluster.clusterArn}
      key={cluster.clusterArn}
      title={cluster.clusterName || ""}
      icon={isLoading ? Icon.CircleProgress : "aws-icons/ecs.png"}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label key={"Name"} title={"Name"} text={`Active / Pending`} />
              {services?.map((s) => (
                <List.Item.Detail.Metadata.Label
                  key={s.serviceName}
                  title={s.serviceName || ""}
                  text={`${s.runningCount} / ${s.pendingCount}`}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            title={"View Services"}
            icon={Icon.Eye}
            target={<ECSClusterServices clusterArn={cluster.clusterArn || ""}></ECSClusterServices>}
          />
          {getActionOpenInBrowser(getClusterUrl(cluster))}
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
