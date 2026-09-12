import { Route } from "@aws-sdk/client-apigatewayv2";
import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useHttpApiRoutes } from "../../hooks/use-apigateway";
import AWSProfileDropdown from "../searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";

export default function HttpApiRoutes({ apiId, apiName }: { apiId: string; apiName: string }) {
  const { routes, error, isLoading, revalidate } = useHttpApiRoutes(apiId);

  const navigationTitle = `Routes for ${apiName}`;

  // Sort routes by route key
  const sortedRoutes = routes?.sort((a, b) => (a.RouteKey || "").localeCompare(b.RouteKey || ""));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter routes..."
      navigationTitle={navigationTitle}
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : !sortedRoutes || sortedRoutes.length === 0 ? (
        <List.EmptyView title="No Routes" description="No routes found for this API" icon={Icon.Link} />
      ) : (
        sortedRoutes.map((route) => <RouteItem key={route.RouteId} route={route} apiId={apiId} />)
      )}
    </List>
  );
}

function RouteItem({ route, apiId }: { route: Route; apiId: string }) {
  const authType = route.AuthorizationType || "NONE";
  const hasAuthorizer = route.AuthorizerId ? "Custom Authorizer" : "";
  const integrationTarget = route.Target?.split("/").pop() || route.Target || "No integration";

  // Parse the route key to get HTTP method
  const [method] = route.RouteKey?.split(" ") || [];

  return (
    <List.Item
      key={route.RouteId}
      icon={Icon.Link}
      title={route.RouteKey || ""}
      subtitle={integrationTarget}
      actions={
        <ActionPanel>
          <AwsAction.Console
            url={resourceToConsoleLink(`${apiId}/routes/${route.RouteId}`, "AWS::ApiGatewayV2::Route")}
          />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Route Key" content={route.RouteKey || ""} />
            <Action.CopyToClipboard title="Copy Route ID" content={route.RouteId || ""} />
            {route.Target && <Action.CopyToClipboard title="Copy Integration Target" content={route.Target} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          text: method,
          icon: { source: Icon.Code, tintColor: getMethodColor(method) },
          tooltip: "HTTP Method",
        },
        {
          text: authType,
          icon: {
            source: authType !== "NONE" ? Icon.Lock : Icon.LockUnlocked,
            tintColor: authType !== "NONE" ? Color.Green : Color.SecondaryText,
          },
          tooltip: hasAuthorizer || `Authorization: ${authType}`,
        },
        ...(route.ApiGatewayManaged
          ? [
              {
                text: "Managed",
                icon: { source: Icon.Shield, tintColor: Color.Blue },
                tooltip: "API Gateway Managed Route",
              },
            ]
          : []),
      ]}
    />
  );
}

function getMethodColor(method?: string): Color {
  switch (method) {
    case "GET":
      return Color.Blue;
    case "POST":
      return Color.Green;
    case "PUT":
      return Color.Yellow;
    case "DELETE":
      return Color.Red;
    case "PATCH":
      return Color.Orange;
    case "OPTIONS":
      return Color.Purple;
    case "ANY":
      return Color.Magenta;
    default:
      return Color.SecondaryText;
  }
}
