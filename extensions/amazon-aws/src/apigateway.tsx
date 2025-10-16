import { RestApi } from "@aws-sdk/client-api-gateway";
import { Api } from "@aws-sdk/client-apigatewayv2";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import ApiGatewayApiKeys from "./components/apigateway/ApiGatewayApiKeys";
import ApiGatewayDeployments from "./components/apigateway/ApiGatewayDeployments";
import ApiGatewayResources from "./components/apigateway/ApiGatewayResources";
import ApiGatewayStages from "./components/apigateway/ApiGatewayStages";
import ApiGatewayUsagePlans from "./components/apigateway/ApiGatewayUsagePlans";
import HttpApiRoutes from "./components/apigateway/HttpApiRoutes";
import HttpApiStages from "./components/apigateway/HttpApiStages";
import { AwsAction } from "./components/common/action";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { useApiGatewayAPIs, useHttpAPIs } from "./hooks/use-apigateway";
import { resourceToConsoleLink } from "./util";

export default function ApiGateway() {
  const { apis: restApis, error: restError, isLoading: restLoading, revalidate: restRevalidate } = useApiGatewayAPIs();
  const { apis: httpApis, error: httpError, isLoading: httpLoading, revalidate: httpRevalidate } = useHttpAPIs();

  const isLoading = restLoading || httpLoading;
  const error = restError || httpError;

  const revalidate = () => {
    restRevalidate();
    httpRevalidate();
  };

  // Combine both API types into a single list
  const allApis = [
    ...(restApis?.map((api) => ({ ...api, type: "REST" as const })) || []),
    ...(httpApis?.map((api) => ({ ...api, type: "HTTP" as const })) || []),
  ];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter APIs by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : allApis.length === 0 && !isLoading ? (
        <List.EmptyView title="No APIs" description="No REST or HTTP APIs found" icon={Icon.Warning} />
      ) : (
        <>
          <List.Section title="REST APIs" subtitle={`${restApis?.length || 0} APIs`}>
            {restApis?.map((api) => (
              <RestApiItem key={api.id} api={api} />
            ))}
          </List.Section>
          <List.Section title="HTTP APIs" subtitle={`${httpApis?.length || 0} APIs`}>
            {httpApis?.map((api) => (
              <HttpApiItem key={api.ApiId} api={api} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function RestApiItem({ api }: { api: RestApi }) {
  const apiEndpoint = api.endpointConfiguration?.types?.[0] || "EDGE";
  const createdDate = api.createdDate ? new Date(api.createdDate).toLocaleDateString() : "";

  return (
    <List.Item
      key={api.id}
      icon="aws-icons/ag.png"
      title={api.name || ""}
      subtitle={api.description || api.id}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Resources"
            icon={Icon.List}
            target={<ApiGatewayResources apiId={api.id || ""} apiName={api.name || ""} />}
          />
          <Action.Push
            title="View Stages"
            icon={Icon.Layers}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            target={<ApiGatewayStages apiId={api.id || ""} apiName={api.name || ""} />}
          />
          <Action.Push
            title="View Deployments"
            icon={Icon.Rocket}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            target={<ApiGatewayDeployments apiId={api.id || ""} apiName={api.name || ""} />}
          />
          <Action.Push
            title="View API Keys"
            icon={Icon.Key}
            shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            target={<ApiGatewayApiKeys apiId={api.id || ""} apiName={api.name || ""} />}
          />
          <Action.Push
            title="View Usage Plans"
            icon={Icon.Calendar}
            shortcut={{ modifiers: ["cmd"], key: "u" }}
            target={<ApiGatewayUsagePlans apiId={api.id || ""} apiName={api.name || ""} />}
          />
          <ActionPanel.Section>
            <AwsAction.Console url={resourceToConsoleLink(api.id, "AWS::ApiGateway::RestApi")} />
            <Action.OpenInBrowser
              icon={Icon.Document}
              title="Open API Documentation"
              url={resourceToConsoleLink(api.id, "AWS::ApiGateway::RestApi::Documentation")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy API ID" content={api.id || ""} />
            <Action.CopyToClipboard title="Copy API Name" content={api.name || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          text: "REST",
          icon: { source: Icon.Code, tintColor: Color.Blue },
          tooltip: "API Type",
        },
        {
          text: apiEndpoint,
          icon: { source: Icon.Globe, tintColor: getEndpointColor(apiEndpoint) },
          tooltip: "Endpoint Type",
        },
        { text: createdDate, tooltip: "Created Date" },
      ]}
    />
  );
}

function HttpApiItem({ api }: { api: Api }) {
  const createdDate = api.CreatedDate ? new Date(api.CreatedDate).toLocaleDateString() : "";
  const protocol = api.ProtocolType || "HTTP";
  const corsEnabled = api.CorsConfiguration ? "CORS Enabled" : "";

  return (
    <List.Item
      key={api.ApiId}
      icon="aws-icons/ag.png"
      title={api.Name || ""}
      subtitle={api.Description || api.ApiEndpoint}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Routes"
            icon={Icon.List}
            target={<HttpApiRoutes apiId={api.ApiId || ""} apiName={api.Name || ""} />}
          />
          <Action.Push
            title="View Stages"
            icon={Icon.Layers}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            target={<HttpApiStages apiId={api.ApiId || ""} apiName={api.Name || ""} />}
          />
          <ActionPanel.Section>
            <AwsAction.Console url={resourceToConsoleLink(api.ApiId, "AWS::ApiGatewayV2::Api")} />
            {api.ApiEndpoint && (
              <Action.OpenInBrowser
                icon={Icon.Globe}
                title="Open API Endpoint"
                url={api.ApiEndpoint}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy API ID" content={api.ApiId || ""} />
            <Action.CopyToClipboard title="Copy API Name" content={api.Name || ""} />
            {api.ApiEndpoint && <Action.CopyToClipboard title="Copy API Endpoint" content={api.ApiEndpoint} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          text: "HTTP",
          icon: { source: Icon.Bolt, tintColor: Color.Green },
          tooltip: "API Type",
        },
        {
          text: protocol,
          tooltip: "Protocol Type",
        },
        ...(corsEnabled
          ? [
              {
                text: corsEnabled,
                icon: { source: Icon.Shield, tintColor: Color.Purple },
                tooltip: "CORS Configuration",
              },
            ]
          : []),
        { text: createdDate, tooltip: "Created Date" },
      ]}
    />
  );
}

function getEndpointColor(type: string): Color {
  switch (type) {
    case "EDGE":
      return Color.Blue;
    case "REGIONAL":
      return Color.Green;
    case "PRIVATE":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}
