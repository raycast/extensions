import { ECSClient, Service, UpdateServiceCommand } from "@aws-sdk/client-ecs";
import { Action, ActionPanel, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchServices, getServiceUrl } from "../../actions";
import { getFilterPlaceholder } from "../../util";
import ECSClusterServiceTasks from "./ECSClusterServiceTasks";
import { AwsAction } from "../common/action";

function ECSClusterServices({ clusterArn }: { clusterArn: string }) {
  const { data: services, isLoading } = useCachedPromise(fetchServices, [clusterArn], { keepPreviousData: true });

  return (
    <List isLoading={isLoading} searchBarPlaceholder={getFilterPlaceholder("services")} isShowingDetail={true}>
      {services ? (
        services.map((service) => (
          <List.Item
            key={service.serviceArn}
            title={service.serviceName || ""}
            icon={Icon.Box}
            detail={
              <List.Item.Detail
                markdown={service.events?.reduce(
                  (acc, cur) => `${acc}\n\n${cur.createdAt?.toLocaleString()}-${cur.message}`,
                  "",
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
                  target={<ECSClusterServiceTasks service={service} />}
                />
                <Action icon={Icon.Repeat} title="Force New Deployment" onAction={() => forceNewDeployment(service)} />
                <AwsAction.Console url={getServiceUrl(service)} />
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

function forceNewDeployment(service: Service) {
  confirmAlert({
    title: "Are you sure you want to force deploy the service?",
    message: "This action cannot be undone.",
    primaryAction: {
      title: "Force Deploy",
      onAction: async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Force deploying..." });

        try {
          await new ECSClient({}).send(
            new UpdateServiceCommand({
              cluster: service.clusterArn,
              service: service.serviceName,
              forceNewDeployment: true,
            }),
          );
          toast.style = Toast.Style.Success;
          toast.title = "Force Deployment done";
        } catch (_err) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to deploy";
        }
      },
    },
  });
}

function getActionCopySection(service: Service) {
  return (
    <ActionPanel.Section title={"Copy"}>
      <AwsAction.ExportResponse response={service} />
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
            "",
          ) || ""
        }
        shortcut={{ modifiers: ["opt"], key: "g" }}
      />
    </ActionPanel.Section>
  );
}

export default ECSClusterServices;
