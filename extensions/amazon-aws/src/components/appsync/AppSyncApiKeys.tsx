import { ApiKey } from "@aws-sdk/client-appsync";
import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useAppSyncApiKeys } from "../../hooks/use-appsync";

export default function AppSyncApiKeys({ apiId, apiName }: { apiId: string; apiName: string }) {
  const { apiKeys, error, isLoading } = useAppSyncApiKeys(apiId);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter API keys..." navigationTitle={`API Keys - ${apiName}`}>
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : apiKeys && apiKeys.length > 0 ? (
        apiKeys.map((apiKey) => <ApiKeyItem key={apiKey.id} apiKey={apiKey} />)
      ) : (
        <List.EmptyView title="No API Keys" description="This API doesn't have any API keys configured" />
      )}
    </List>
  );
}

function ApiKeyItem({ apiKey }: { apiKey: ApiKey }) {
  const expirationDate = apiKey.expires ? new Date(apiKey.expires * 1000) : null;
  const isExpired = expirationDate ? expirationDate < new Date() : false;
  const daysUntilExpiry = expirationDate
    ? Math.ceil((expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const statusInfo = getKeyStatus(isExpired, daysUntilExpiry);

  return (
    <List.Item
      key={apiKey.id}
      icon={{ source: Icon.Key, tintColor: statusInfo.color }}
      title={apiKey.description || apiKey.id || "API Key"}
      subtitle={expirationDate ? `Expires: ${expirationDate.toLocaleDateString()}` : "No expiration"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy API Key ID" content={apiKey.id || ""} />
          {apiKey.description && <Action.CopyToClipboard title="Copy Description" content={apiKey.description} />}
        </ActionPanel>
      }
      accessories={[
        {
          text: statusInfo.text,
          icon: { source: statusInfo.icon, tintColor: statusInfo.color },
        },
        ...(daysUntilExpiry !== null && !isExpired
          ? [{ text: `${daysUntilExpiry}d`, tooltip: "Days until expiry" }]
          : []),
      ]}
    />
  );
}

function getKeyStatus(
  isExpired: boolean,
  daysUntilExpiry: number | null,
): { text: string; icon: string; color: Color } {
  if (isExpired) {
    return { text: "Expired", icon: Icon.XMarkCircle, color: Color.Red };
  }
  if (daysUntilExpiry !== null && daysUntilExpiry <= 7) {
    return { text: "Expiring Soon", icon: Icon.ExclamationMark, color: Color.Orange };
  }
  if (daysUntilExpiry !== null && daysUntilExpiry <= 30) {
    return { text: "Active", icon: Icon.CheckCircle, color: Color.Yellow };
  }
  return { text: "Active", icon: Icon.CheckCircle, color: Color.Green };
}
