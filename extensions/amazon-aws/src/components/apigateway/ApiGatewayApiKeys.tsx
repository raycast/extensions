import { ApiKey } from "@aws-sdk/client-api-gateway";
import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useApiGatewayApiKeys } from "../../hooks/use-apigateway";
import AWSProfileDropdown from "../searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";

export default function ApiGatewayApiKeys({ apiId, apiName }: { apiId: string; apiName: string }) {
  const { apiKeys, error, isLoading, revalidate } = useApiGatewayApiKeys();

  const navigationTitle = `API Keys - ${apiName}`;

  // Show all API keys but mark which ones are associated with this API
  const apiKeysWithAssociation = apiKeys?.map((key) => ({
    ...key,
    isAssociated: key.stageKeys?.some((stageKey) => stageKey?.startsWith(`${apiId}/`)) || false,
  }));

  // Sort to show associated keys first
  const sortedApiKeys = apiKeysWithAssociation?.sort((a, b) => {
    if (a.isAssociated && !b.isAssociated) return -1;
    if (!a.isAssociated && b.isAssociated) return 1;
    return 0;
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter API keys by name..."
      navigationTitle={navigationTitle}
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : !sortedApiKeys || sortedApiKeys.length === 0 ? (
        <List.EmptyView title="No API Keys" description="No API keys found in this region" icon={Icon.Key} />
      ) : (
        sortedApiKeys.map((apiKey) => <ApiKeyItem key={apiKey.id} apiKey={apiKey} apiId={apiId} />)
      )}
    </List>
  );
}

function ApiKeyItem({ apiKey, apiId }: { apiKey: ApiKey & { isAssociated?: boolean }; apiId: string }) {
  const createdDate = apiKey.createdDate ? new Date(apiKey.createdDate).toLocaleDateString() : "";
  const isEnabled = apiKey.enabled ?? false;

  // Get the stages this key is associated with for this API
  const associatedStages = apiKey.stageKeys
    ?.filter((stageKey) => stageKey?.startsWith(`${apiId}/`))
    .map((stageKey) => stageKey?.split("/")[1])
    .filter(Boolean)
    .join(", ");

  return (
    <List.Item
      key={apiKey.id}
      icon={Icon.Key}
      title={apiKey.name || apiKey.id || ""}
      subtitle={apiKey.description || (associatedStages ? `Stages: ${associatedStages}` : "")}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(apiKey.id, "AWS::ApiGateway::ApiKey")} />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy API Key ID" content={apiKey.id || ""} />
            <Action.CopyToClipboard title="Copy API Key Name" content={apiKey.name || ""} />
            {apiKey.value && <Action.CopyToClipboard title="Copy API Key Value" content={apiKey.value} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        ...(apiKey.isAssociated
          ? [
              {
                text: "Linked",
                icon: { source: Icon.Link, tintColor: Color.Blue },
                tooltip: associatedStages ? `Linked to stages: ${associatedStages}` : "Linked to this API",
              },
            ]
          : []),
        {
          text: isEnabled ? "Enabled" : "Disabled",
          icon: {
            source: isEnabled ? Icon.CheckCircle : Icon.XMarkCircle,
            tintColor: isEnabled ? Color.Green : Color.Red,
          },
        },
        { text: createdDate, tooltip: "Created Date" },
      ]}
    />
  );
}
