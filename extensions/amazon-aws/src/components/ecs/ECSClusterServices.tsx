import { Service } from "@aws-sdk/client-ecs";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchServices, getServiceUrl } from "../../actions";
import { getActionOpenInBrowser, getExportResponse, getFilterPlaceholder } from "../../util";
import ECSClusterServiceTasks from "./ECSClusterServiceTasks";

function ECSClusterServices({ clusterArn }: { clusterArn: string }) {
  const { data: services, isLoading } = useCachedPromise(fetchServices, [clusterArn], { keepPreviousData: true });

  return (
    <List isLoading={isLoading} searchBarPlaceholder={getFilterPlaceholder("services")} isShowingDetail={true}>
      {services ? (
        services.map((service) => (
          <List.Item
            id={service.serviceArn}
            key={service.serviceArn}
            title={service.serviceName || ""}
            icon={Icon.Box}
            detail={
              <List.Item.Detail
                markdown={service.events?.reduce(
                  (acc, cur) => `${acc}\n\n${cur.createdAt?.toLocaleString()}-${cur.message}`,
                  ""
                )}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="ARN" text={service.serviceArn} />
                    <List.Item.Detail.Metadata.Label
                      title="Execute Enabled"
                      text={`${service.enableExecuteCommand ? "true" : "false"}`}
                    />
                    <List.Item.Detail.Metadata.Label title="Scheduling Strategy" text={service.schedulingStrategy} />
                    <List.Item.Detail.Metadata.Label
                      title="Deployment Configuration"
                      text={`Max: ${service.deploymentConfiguration?.maximumPercent}% | Min: ${service.deploymentConfiguration?.minimumHealthyPercent}% | Controller: ${service.deploymentController?.type}`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="VPC"
                      text={`IP: ${
                        service.networkConfiguration?.awsvpcConfiguration?.assignPublicIp === "ENABLED"
                          ? "Public"
                          : "Private"
                      } | Subnets: ${service.networkConfiguration?.awsvpcConfiguration?.subnets?.length} | SG: ${
                        service.networkConfiguration?.awsvpcConfiguration?.securityGroups?.length
                      }`}
                    />
                    <List.Item.Detail.Metadata.Label title="Creation Date" text={service.createdAt?.toLocaleString()} />
                    <List.Item.Detail.Metadata.Label
                      title="Providers"
                      text={service.capacityProviderStrategy?.reduce((acc, curr) => {
                        return `Provider: ${curr.capacityProvider} Weight: ${curr.weight} Base: ${curr.base}`;
                      }, "")}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title={"View Tasks"}
                  icon={Icon.Eye}
                  target={<ECSClusterServiceTasks service={service}></ECSClusterServiceTasks>}
                />
                {getActionOpenInBrowser(getServiceUrl(service))}
                {getActionCopySection(service)}
              </ActionPanel>
            }
            accessories={[
              { text: `${service.runningCount}`, tooltip: "Running", icon: Icon.Play },
              { text: `${service.pendingCount}`, tooltip: "Pending", icon: Icon.Clock },
            ]}
          />
        ))
      ) : (
        <List.EmptyView title="No Services Found" />
      )}
    </List>
  );
}

function getActionCopySection(service: Service) {
  return (
    <ActionPanel.Section title={"Copy"}>
      {getExportResponse(service)}
      <Action.CopyToClipboard
        title="Copy Service ARN"
        content={service.serviceArn || ""}
        shortcut={{ modifiers: ["opt"], key: "c" }}
      />
      <Action.CopyToClipboard
        title="Copy VPC Subnet IDs"
        content={
          service.networkConfiguration?.awsvpcConfiguration?.subnets?.reduce((acc, cur) => `${cur},${acc}`, "") || ""
        }
        shortcut={{ modifiers: ["opt"], key: "s" }}
      />
      <Action.CopyToClipboard
        title="Copy VPC SG IDs"
        content={
          service.networkConfiguration?.awsvpcConfiguration?.securityGroups?.reduce(
            (acc, cur) => `${cur},${acc}`,
            ""
          ) || ""
        }
        shortcut={{ modifiers: ["opt"], key: "g" }}
      />
    </ActionPanel.Section>
  );
}

export default ECSClusterServices;
