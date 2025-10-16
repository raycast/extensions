import { Stage } from "@aws-sdk/client-api-gateway";
import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useApiGatewayStages } from "../../hooks/use-apigateway";
import AWSProfileDropdown from "../searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";

export default function ApiGatewayStages({ apiId, apiName }: { apiId: string; apiName: string }) {
  const { stages, error, isLoading, revalidate } = useApiGatewayStages(apiId);

  const navigationTitle = `Stages for ${apiName}`;
  const region = process.env.AWS_REGION || "us-east-1";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter stages by name..."
      navigationTitle={navigationTitle}
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        stages?.map((stage) => <StageItem key={stage.stageName} stage={stage} apiId={apiId} region={region} />)
      )}
    </List>
  );
}

function StageItem({ stage, apiId, region }: { stage: Stage; apiId: string; region: string }) {
  const invokeUrl = `https://${apiId}.execute-api.${region}.amazonaws.com/${stage.stageName}`;
  const lastUpdated = stage.lastUpdatedDate ? new Date(stage.lastUpdatedDate).toLocaleDateString() : "";

  return (
    <List.Item
      key={stage.stageName}
      icon={Icon.Layers}
      title={stage.stageName || ""}
      subtitle={stage.description || invokeUrl}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Invoke URL" url={invokeUrl} icon={Icon.Globe} />
          <AwsAction.Console
            url={resourceToConsoleLink(`${apiId}/stages/${stage.stageName}`, "AWS::ApiGateway::Stage")}
          />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Invoke URL" content={invokeUrl} />
            <Action.CopyToClipboard title="Copy Stage Name" content={stage.stageName || ""} />
            <Action.CopyToClipboard title="Copy Deployment ID" content={stage.deploymentId || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          text: stage.cacheClusterEnabled ? "Cache Enabled" : "No Cache",
          icon: {
            source: stage.cacheClusterEnabled ? Icon.CheckCircle : Icon.XMarkCircle,
            tintColor: stage.cacheClusterEnabled ? Color.Green : Color.SecondaryText,
          },
        },
        { text: lastUpdated, tooltip: "Last Updated" },
      ]}
    />
  );
}
