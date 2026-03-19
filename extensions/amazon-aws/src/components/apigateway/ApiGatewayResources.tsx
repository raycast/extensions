import { Resource } from "@aws-sdk/client-api-gateway";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useApiGatewayResources } from "../../hooks/use-apigateway";
import AWSProfileDropdown from "../searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";
import ApiGatewayInvoke from "./ApiGatewayInvoke";
import ApiGatewayMethodDetail from "./ApiGatewayMethodDetail";

interface ApiGatewayResourcesProps {
  apiId: string;
  apiName: string;
}

export default function ApiGatewayResources({ apiId, apiName }: ApiGatewayResourcesProps) {
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
        resources?.map((resource) => (
          <ResourceItem key={resource.id} resource={resource} apiId={apiId} apiName={apiName} />
        ))
      )}
    </List>
  );
}

interface ResourceItemProps {
  resource: Resource;
  apiId: string;
  apiName: string;
}

function ResourceItem({ resource, apiId, apiName }: ResourceItemProps) {
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
            <ActionPanel.Section title="View Details">
              {methods.map((method) => (
                <Action.Push
                  key={`view-${method}`}
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
          {methods.length > 0 && (
            <ActionPanel.Section title="Test Invoke">
              {methods.map((method) => (
                <Action.Push
                  key={`test-${method}`}
                  title={`Test ${method}`}
                  icon={Icon.Play}
                  shortcut={method === "GET" ? { modifiers: ["cmd"], key: "t" } : undefined}
                  target={
                    <ApiGatewayInvoke
                      apiId={apiId}
                      apiName={apiName}
                      resourceId={resource.id || ""}
                      resourcePath={resource.path || "/"}
                      httpMethod={method}
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
            <AwsAction.ExportResponse response={resource} />
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
