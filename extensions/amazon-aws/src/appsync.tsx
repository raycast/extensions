import { GraphqlApi } from "@aws-sdk/client-appsync";
import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useAppSyncAPIs } from "./hooks/use-appsync";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";
import AppSyncApiDetail from "./components/appsync/AppSyncApiDetail";
import AppSyncDataSources from "./components/appsync/AppSyncDataSources";
import AppSyncResolvers from "./components/appsync/AppSyncResolvers";
import AppSyncSchema from "./components/appsync/AppSyncSchema";
import AppSyncApiKeys from "./components/appsync/AppSyncApiKeys";

export default function AppSync() {
  const { apis, error, isLoading, revalidate } = useAppSyncAPIs();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter GraphQL APIs by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        apis?.map((api) => <AppSyncApi key={api.apiId} api={api} />)
      )}
    </List>
  );
}

function AppSyncApi({ api }: { api: GraphqlApi }) {
  const authenticationType = getAuthenticationType(api.authenticationType);
  const apiEndpoint = api.uris?.GRAPHQL || "";

  return (
    <List.Item
      key={api.apiId}
      icon={"aws-icons/appsync.png"}
      title={api.name || ""}
      subtitle={api.apiId}
      actions={
        <ActionPanel>
          <Action.Push title="View API Details" icon={Icon.Eye} target={<AppSyncApiDetail apiId={api.apiId || ""} />} />
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
            <Action.CopyToClipboard title="Copy API ID" content={api.apiId || ""} />
            <Action.CopyToClipboard title="Copy API ARN" content={api.arn || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          text: authenticationType.text,
          icon: { source: authenticationType.icon, tintColor: authenticationType.color },
        },
        { text: api.tags?.Environment || "", tooltip: "Environment" },
      ]}
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
