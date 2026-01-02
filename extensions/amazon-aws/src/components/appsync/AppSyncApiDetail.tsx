import { Action, ActionPanel, Detail, Icon, Color } from "@raycast/api";
import { useAppSyncApiDetails } from "../../hooks/use-appsync";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";
import AppSyncDataSources from "./AppSyncDataSources";
import AppSyncResolvers from "./AppSyncResolvers";
import AppSyncSchema from "./AppSyncSchema";
import AppSyncApiKeys from "./AppSyncApiKeys";

export default function AppSyncApiDetail({ apiId }: { apiId: string }) {
  const { api, error, isLoading } = useAppSyncApiDetails(apiId);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error.message}`}
        navigationTitle="AppSync API Details"
        actions={
          <ActionPanel>
            <AwsAction.Console url={resourceToConsoleLink(apiId, "AWS::AppSync::GraphQLApi")} />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading || !api) {
    return <Detail isLoading={true} navigationTitle="AppSync API Details" />;
  }

  const authenticationType = getAuthenticationType(api.authenticationType);
  const apiEndpoint = api.uris?.GRAPHQL || "";
  const realtimeEndpoint = api.uris?.REALTIME || "";

  const markdown = `# ${api.name}

## Overview
**API ID:** ${api.apiId}  
**ARN:** ${api.arn}  
**Authentication:** ${authenticationType.text}  
**Owner:** ${api.ownerContact || "Not specified"}

## Endpoints
**GraphQL Endpoint:**  
\`${apiEndpoint}\`

${
  realtimeEndpoint
    ? `**Realtime Endpoint:**  
\`${realtimeEndpoint}\``
    : ""
}

## Configuration
**Logging:** ${api.logConfig?.cloudWatchLogsRoleArn ? "✅ Enabled" : "❌ Disabled"}  
${api.logConfig?.fieldLogLevel ? `**Log Level:** ${api.logConfig.fieldLogLevel}` : ""}
${api.logConfig?.excludeVerboseContent ? "**Exclude Verbose Content:** Yes" : ""}

**Additional Authentication:** ${
    api.additionalAuthenticationProviders && api.additionalAuthenticationProviders.length > 0
      ? api.additionalAuthenticationProviders
          .map((auth) => getAuthenticationType(auth.authenticationType).text)
          .join(", ")
      : "None"
  }

**XRay Tracing:** ${api.xrayEnabled ? "✅ Enabled" : "❌ Disabled"}

**Introspection:** ${api.introspectionConfig === "ENABLED" ? "✅ Enabled" : "❌ Disabled"}

**Query Depth Limit:** ${api.queryDepthLimit || "Not set"}

**Resolver Count Limit:** ${api.resolverCountLimit || "Not set"}

${
  api.tags && Object.keys(api.tags).length > 0
    ? `## Tags
${Object.entries(api.tags)
  .map(([key, value]) => `**${key}:** ${value}`)
  .join("  \n")}`
    : ""
}

`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${api.name} - AppSync API`}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Data Sources"
            icon={Icon.HardDrive}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            target={<AppSyncDataSources apiId={api.apiId || ""} apiName={api.name || ""} />}
          />
          <Action.Push
            title="View Resolvers"
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            target={<AppSyncResolvers apiId={api.apiId || ""} apiName={api.name || ""} />}
          />
          <Action.Push
            title="View Schema"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            target={<AppSyncSchema apiId={api.apiId || ""} apiName={api.name || ""} />}
          />
          <Action.Push
            title="View API Keys"
            icon={Icon.Key}
            shortcut={{ modifiers: ["cmd"], key: "k" }}
            target={<AppSyncApiKeys apiId={api.apiId || ""} apiName={api.name || ""} />}
          />
          <ActionPanel.Section>
            <AwsAction.Console url={resourceToConsoleLink(api.apiId, "AWS::AppSync::GraphQLApi")} />
            <Action.OpenInBrowser
              icon={Icon.Play}
              title="Open GraphQL Playground"
              url={resourceToConsoleLink(api.apiId, "AWS::AppSync::GraphQLApi::Playground")}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy GraphQL Endpoint" content={apiEndpoint} />
            {realtimeEndpoint && <Action.CopyToClipboard title="Copy Realtime Endpoint" content={realtimeEndpoint} />}
            <Action.CopyToClipboard title="Copy API ID" content={api.apiId || ""} />
            <Action.CopyToClipboard title="Copy API ARN" content={api.arn || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="API ID" text={api.apiId || ""} />
          <Detail.Metadata.Label
            title="Status"
            text="Active"
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Authentication"
            text={authenticationType.text}
            icon={{ source: authenticationType.icon, tintColor: authenticationType.color }}
          />
          <Detail.Metadata.Label title="XRay Tracing" text={api.xrayEnabled ? "Enabled" : "Disabled"} />
          <Detail.Metadata.Label title="Logging" text={api.logConfig?.cloudWatchLogsRoleArn ? "Enabled" : "Disabled"} />
          {api.logConfig?.fieldLogLevel && (
            <Detail.Metadata.Label title="Log Level" text={api.logConfig.fieldLogLevel} />
          )}
          {api.ownerContact && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Owner Contact" text={api.ownerContact} />
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}

function getAuthenticationType(type?: string): { text: string; icon: string; color: Color } {
  switch (type) {
    case "API_KEY":
      return { text: "API Key", icon: Icon.Key, color: Color.Blue };
    case "AWS_IAM":
      return { text: "IAM", icon: Icon.Shield, color: Color.Green };
    case "AMAZON_COGNITO_USER_POOLS":
      return { text: "Cognito", icon: Icon.PersonCircle, color: Color.Purple };
    case "OPENID_CONNECT":
      return { text: "OpenID", icon: Icon.Globe, color: Color.Orange };
    case "AWS_LAMBDA":
      return { text: "Lambda", icon: Icon.Bolt, color: Color.Yellow };
    default:
      return { text: type || "Unknown", icon: Icon.QuestionMark, color: Color.SecondaryText };
  }
}
