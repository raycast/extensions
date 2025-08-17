import { Stage } from "@aws-sdk/client-apigatewayv2";
import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useHttpApiStages } from "../../hooks/use-apigateway";
import AWSProfileDropdown from "../searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";

export default function HttpApiStages({ apiId, apiName }: { apiId: string; apiName: string }) {
  const { stages, error, isLoading, revalidate } = useHttpApiStages(apiId);

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
      ) : !stages || stages.length === 0 ? (
        <List.EmptyView title="No Stages" description="No stages found for this API" icon={Icon.Layers} />
      ) : (
        stages.map((stage) => <StageItem key={stage.StageName} stage={stage} apiId={apiId} region={region} />)
      )}
    </List>
  );
}

function StageItem({ stage, apiId, region }: { stage: Stage; apiId: string; region: string }) {
  const invokeUrl = `https://${apiId}.execute-api.${region}.amazonaws.com/${stage.StageName}`;
  const lastUpdated = stage.LastUpdatedDate ? new Date(stage.LastUpdatedDate).toLocaleDateString() : "";
  const isDefault = stage.ApiGatewayManaged || false;
  const autoDeploy = stage.AutoDeploy || false;

  return (
    <List.Item
      key={stage.StageName}
      icon={Icon.Layers}
      title={stage.StageName || ""}
      subtitle={stage.Description || invokeUrl}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Invoke URL" url={invokeUrl} icon={Icon.Globe} />
          <AwsAction.Console
            url={resourceToConsoleLink(`${apiId}/stages/${stage.StageName}`, "AWS::ApiGatewayV2::Stage")}
          />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Invoke URL" content={invokeUrl} />
            <Action.CopyToClipboard title="Copy Stage Name" content={stage.StageName || ""} />
            {stage.DeploymentId && <Action.CopyToClipboard title="Copy Deployment ID" content={stage.DeploymentId} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        ...(isDefault
          ? [
              {
                text: "$default",
                icon: { source: Icon.Star, tintColor: Color.Yellow },
                tooltip: "Default Stage",
              },
            ]
          : []),
        ...(autoDeploy
          ? [
              {
                text: "Auto-Deploy",
                icon: { source: Icon.Rocket, tintColor: Color.Green },
                tooltip: "Auto-deploy enabled",
              },
            ]
          : []),
        ...(stage.RouteSettings && stage.RouteSettings["*"]
          ? [
              {
                text: `${stage.RouteSettings["*"].ThrottlingRateLimit || "∞"} req/s`,
                icon: { source: Icon.Gauge, tintColor: Color.Blue },
                tooltip: `Rate Limit: ${stage.RouteSettings["*"].ThrottlingRateLimit || "∞"} req/s, Burst: ${
                  stage.RouteSettings["*"].ThrottlingBurstLimit || "∞"
                }`,
              },
            ]
          : []),
        { text: lastUpdated, tooltip: "Last Updated" },
      ]}
    />
  );
}
