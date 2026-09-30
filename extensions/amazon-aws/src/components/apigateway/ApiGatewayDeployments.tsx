import { Deployment } from "@aws-sdk/client-api-gateway";
import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useApiGatewayDeployments } from "../../hooks/use-apigateway";
import AWSProfileDropdown from "../searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";

export default function ApiGatewayDeployments({ apiId, apiName }: { apiId: string; apiName: string }) {
  const { deployments, error, isLoading, revalidate } = useApiGatewayDeployments(apiId);

  const navigationTitle = `Deployments for ${apiName}`;

  // Sort deployments by created date (newest first)
  const sortedDeployments = deployments?.sort((a, b) => {
    const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
    const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter deployments..."
      navigationTitle={navigationTitle}
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : !sortedDeployments || sortedDeployments.length === 0 ? (
        <List.EmptyView title="No Deployments" description="No deployments found for this API" icon={Icon.Rocket} />
      ) : (
        sortedDeployments.map((deployment, index) => (
          <DeploymentItem key={deployment.id} deployment={deployment} apiId={apiId} isLatest={index === 0} />
        ))
      )}
    </List>
  );
}

function DeploymentItem({ deployment, apiId, isLatest }: { deployment: Deployment; apiId: string; isLatest: boolean }) {
  const createdDate = deployment.createdDate ? new Date(deployment.createdDate).toLocaleString() : "";

  return (
    <List.Item
      key={deployment.id}
      icon={Icon.Rocket}
      title={deployment.id || ""}
      subtitle={deployment.description || "No description"}
      actions={
        <ActionPanel>
          <AwsAction.Console
            url={resourceToConsoleLink(`${apiId}/deployments/${deployment.id}`, "AWS::ApiGateway::Deployment")}
          />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Deployment ID" content={deployment.id || ""} />
            {deployment.description && (
              <Action.CopyToClipboard title="Copy Description" content={deployment.description} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        ...(isLatest
          ? [
              {
                text: "Latest",
                icon: { source: Icon.Star, tintColor: Color.Yellow },
                tooltip: "Latest Deployment",
              },
            ]
          : []),
        { text: createdDate, tooltip: "Created Date" },
      ]}
    />
  );
}
