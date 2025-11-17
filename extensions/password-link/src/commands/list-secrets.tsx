import { ActionPanel, Action, List, showToast, Toast, Icon, useNavigation, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { apiClient } from "../lib/api-client";
import { Secret, SecretRequest } from "../types";
import { formatDate, formatViewCount } from "../lib/utils";
import { CreateActions } from "../lib/action-panels";
import { loadSecrets, findRelatedRequests } from "../lib/data-utils";
import { showFailureToast } from "@raycast/utils";

/**
 * List Secrets Command
 * Displays all secrets with search and management capabilities
 */
export default function ListSecrets() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [relatedRequestsMap, setRelatedRequestsMap] = useState<Record<string, SecretRequest[]>>({});
  const { push } = useNavigation();

  /**
   * Load secrets and related data
   */
  async function loadSecretsData() {
    setIsLoading(true);
    try {
      const secretsData = await loadSecrets();
      setSecrets(secretsData);

      // Load related requests for all secrets
      const relatedRequests = await findRelatedRequests(secretsData);
      setRelatedRequestsMap(relatedRequests);
    } catch (error) {
      console.error("Failed to load secrets data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Delete a secret
   * @param id - Secret ID to delete
   */
  async function deleteSecret(id: string) {
    try {
      await apiClient.deleteSecret(id);
      await showToast({
        style: Toast.Style.Success,
        title: "Secret Deleted",
        message: "Secret has been deleted successfully",
      });
      // Reload secrets
      await loadSecretsData();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete secret" });
    }
  }

  useEffect(() => {
    loadSecretsData();
  }, []);

  // Filter secrets based on search text
  const filteredSecrets = secrets.filter((secret) => {
    const searchLower = searchText.toLowerCase();
    return secret.id.toLowerCase().includes(searchLower) || secret.message?.toLowerCase().includes(searchLower);
  });

  const renderSecretItem = (secret: Secret) => {
    const viewCountText = formatViewCount(secret.view_times, secret.max_views);
    const hasViews = secret.view_times > 0;
    const displayTitle = secret.description || secret.message || secret.id;
    const hasRelatedRequests = (relatedRequestsMap[secret.id] || []).length > 0;
    const relatedRequests = relatedRequestsMap[secret.id] || [];

    return (
      <List.Item
        key={secret.id}
        title={displayTitle}
        subtitle={formatDate(secret.created_at)}
        accessories={[
          ...(hasRelatedRequests
            ? [
                {
                  icon: Icon.Document,
                  tooltip: "Has related secret request",
                },
              ]
            : []),
          {
            tag: {
              value: hasViews ? viewCountText : "Not viewed",
              color: hasViews ? Color.Green : Color.Red,
            },
          },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="View Details"
                icon={Icon.Document}
                onAction={() => {
                  import("../components/SecretDetail").then(({ default: SecretDetail }) => {
                    push(<SecretDetail secret={secret} onDelete={deleteSecret} />);
                  });
                }}
              />
              {hasRelatedRequests && (
                <Action
                  title="View Secret Request"
                  icon={Icon.Document}
                  onAction={() => {
                    import("../components/SecretRequestDetail").then(({ default: SecretRequestDetail }) => {
                      push(<SecretRequestDetail request={relatedRequests[0]} onDelete={() => {}} />);
                    });
                  }}
                />
              )}
              <Action
                title="Delete Secret"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteSecret(secret.id)}
              />
            </ActionPanel.Section>
            <CreateActions push={push} />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search secrets..." onSearchTextChange={setSearchText}>
      {filteredSecrets.map(renderSecretItem)}
    </List>
  );
}
