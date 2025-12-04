import { Resource } from "@aws-sdk/client-api-gateway";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useApiGatewayResources } from "../../hooks/use-apigateway";
import AWSProfileDropdown from "../searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";
import ApiGatewayMethodDetail from "./ApiGatewayMethodDetail";

export default function ApiGatewayResources({ apiId, apiName }: { apiId: string; apiName: string }) {
  const { resources, error, isLoading, revalidate } = useApiGatewayResources(apiId);

  const navigationTitle = `Resources for ${apiName}`;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter resources by path..."
      navigationTitle={navigationTitle}
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        resources?.map((resource) => <ResourceItem key={resource.id} resource={resource} apiId={apiId} />)
      )}
    </List>
  );
}

function ResourceItem({ resource, apiId }: { resource: Resource; apiId: string }) {
  const methods = Object.keys(resource.resourceMethods || {});
  const methodsText = methods.join(", ") || "No methods";

  return (
    <List.Item
      key={resource.id}
      icon={Icon.Link}
      title={resource.path || "/"}
      subtitle={resource.id}
      actions={
        <ActionPanel>
          {methods.length > 0 && (
            <ActionPanel.Section title="Methods">
              {methods.map((method) => (
                <Action.Push
                  key={method}
                  title={`View ${method} Details`}
                  icon={Icon.Eye}
                  target={
                    <ApiGatewayMethodDetail
                      apiId={apiId}
                      resourceId={resource.id || ""}
                      httpMethod={method}
                      resourcePath={resource.path || "/"}
                    />
                  }
                />
              ))}
            </ActionPanel.Section>
          )}
          <AwsAction.Console
            url={resourceToConsoleLink(`${apiId}/resources/${resource.id}`, "AWS::ApiGateway::Resource")}
          />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Resource Path" content={resource.path || "/"} />
            <Action.CopyToClipboard title="Copy Resource ID" content={resource.id || ""} />
            <Action.CopyToClipboard title="Copy Parent ID" content={resource.parentId || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        { text: methodsText, tooltip: "HTTP Methods" },
        { icon: Icon.Layers, tooltip: `Parent: ${resource.parentId || "root"}` },
      ]}
    />
  );
}
