import { Authorizer } from "@aws-sdk/client-api-gateway";
import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useApiGatewayAuthorizers } from "../../hooks/use-apigateway";
import AWSProfileDropdown from "../searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";

interface ApiGatewayAuthorizersProps {
  apiId: string;
  apiName: string;
}

/**
 * Component to display and manage API Gateway authorizers for a REST API
 */
export default function ApiGatewayAuthorizers({ apiId, apiName }: ApiGatewayAuthorizersProps) {
  const { authorizers, error, isLoading, revalidate } = useApiGatewayAuthorizers(apiId);

  const navigationTitle = `Authorizers for ${apiName}`;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter authorizers by name..."
      navigationTitle={navigationTitle}
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : authorizers?.length === 0 ? (
        <List.EmptyView
          title="No Authorizers"
          description="No authorizers configured for this API"
          icon={Icon.Shield}
        />
      ) : (
        authorizers?.map((authorizer) => <AuthorizerItem key={authorizer.id} authorizer={authorizer} apiId={apiId} />)
      )}
    </List>
  );
}

interface AuthorizerItemProps {
  authorizer: Authorizer;
  apiId: string;
}

function AuthorizerItem({ authorizer, apiId }: AuthorizerItemProps) {
  const authorizerType = authorizer.type || "UNKNOWN";
  const ttlSeconds = authorizer.authorizerResultTtlInSeconds;

  return (
    <List.Item
      key={authorizer.id}
      icon={getAuthorizerIcon(authorizerType)}
      title={authorizer.name || ""}
      subtitle={getAuthorizerSubtitle(authorizer)}
      actions={
        <ActionPanel>
          <AwsAction.Console
            url={resourceToConsoleLink(`${apiId}/authorizers/${authorizer.id}`, "AWS::ApiGateway::Authorizer")}
          />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Authorizer ID" content={authorizer.id || ""} />
            <Action.CopyToClipboard title="Copy Authorizer Name" content={authorizer.name || ""} />
            {authorizer.authorizerUri && (
              <Action.CopyToClipboard title="Copy Authorizer URI" content={authorizer.authorizerUri} />
            )}
            {authorizer.providerARNs && authorizer.providerARNs.length > 0 && (
              <Action.CopyToClipboard
                title="Copy Cognito User Pool ARNs"
                content={authorizer.providerARNs.join(", ")}
              />
            )}
            <AwsAction.ExportResponse response={authorizer} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          text: formatAuthorizerType(authorizerType),
          icon: getAuthorizerIcon(authorizerType),
          tooltip: "Authorizer Type",
        },
        ...(ttlSeconds !== undefined
          ? [
              {
                text: `TTL: ${ttlSeconds}s`,
                icon: Icon.Clock,
                tooltip: "Result Cache TTL",
              },
            ]
          : []),
        ...(authorizer.identitySource
          ? [
              {
                text: authorizer.identitySource,
                icon: Icon.Key,
                tooltip: "Identity Source",
              },
            ]
          : []),
      ]}
    />
  );
}

/**
 * Returns the appropriate icon for an authorizer type
 */
function getAuthorizerIcon(type: string): { source: Icon; tintColor: Color } {
  switch (type) {
    case "TOKEN":
      return { source: Icon.Bolt, tintColor: Color.Yellow };
    case "REQUEST":
      return { source: Icon.Key, tintColor: Color.Blue };
    case "COGNITO_USER_POOLS":
      return { source: Icon.Person, tintColor: Color.Purple };
    default:
      return { source: Icon.Shield, tintColor: Color.SecondaryText };
  }
}

/**
 * Formats the authorizer type for display
 */
function formatAuthorizerType(type: string): string {
  switch (type) {
    case "TOKEN":
      return "Lambda Token";
    case "REQUEST":
      return "Lambda Request";
    case "COGNITO_USER_POOLS":
      return "Cognito";
    default:
      return type;
  }
}

/**
 * Returns a subtitle based on authorizer configuration
 */
function getAuthorizerSubtitle(authorizer: Authorizer): string {
  if (authorizer.authorizerUri) {
    // Extract Lambda function name from URI
    const lambdaMatch = authorizer.authorizerUri.match(/function:([^/]+)/);
    if (lambdaMatch) {
      return `Lambda: ${lambdaMatch[1]}`;
    }
    return authorizer.authorizerUri;
  }

  if (authorizer.providerARNs && authorizer.providerARNs.length > 0) {
    // Extract Cognito User Pool name from ARN
    const poolMatch = authorizer.providerARNs[0].match(/userpool\/([^/]+)/);
    if (poolMatch) {
      return `User Pool: ${poolMatch[1]}`;
    }
    return `${authorizer.providerARNs.length} User Pool(s)`;
  }

  return authorizer.id || "";
}
