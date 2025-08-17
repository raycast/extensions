import { ActionPanel, Action, List, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { apiClient } from "../lib/api-client";
import { SecretRequest, Secret } from "../types";
import { copyRequestUrl, openRequest } from "../lib/action-utils";
import { CreateActions } from "../lib/action-panels";
import { loadSecretRequests, findRelatedSecrets } from "../lib/data-utils";
import { showFailureToast } from "@raycast/utils";

/**
 * List Secret Requests Command
 * Lists all secret requests from password.link API
 */
export default function ListSecretRequests() {
  const { push } = useNavigation();
  const [requests, setRequests] = useState<SecretRequest[]>([]);
  const [relatedSecretsMap, setRelatedSecretsMap] = useState<Record<string, Secret[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<"all" | "with-secrets" | "waiting-for-secrets">("all");

  /**
   * Load requests and related data
   */
  async function loadRequestsData() {
    setIsLoading(true);
    try {
      const requestsData = await loadSecretRequests();
      setRequests(requestsData);

      // Load related secrets for all requests
      const relatedSecrets = await findRelatedSecrets(requestsData);
      setRelatedSecretsMap(relatedSecrets);
    } catch (error) {
      console.error("Failed to load requests data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Delete a secret request
   * @param id - Secret request ID to delete
   */
  async function deleteRequest(id: string) {
    try {
      await apiClient.deleteSecretRequest(id);
      await showToast({
        style: Toast.Style.Success,
        title: "Request Deleted",
        message: "Secret request has been deleted successfully",
      });
      // Reload requests
      await loadRequestsData();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete secret request" });
    }
  }

  /**
   * Open related secret
   * @param requestId - Request ID
   */
  function openRelatedSecret(requestId: string) {
    const relatedSecrets = relatedSecretsMap[requestId];
    if (relatedSecrets && relatedSecrets.length > 0) {
      const secret = relatedSecrets[0];
      import("../components/SecretDetail").then(({ default: SecretDetail }) => {
        push(<SecretDetail secret={secret} />);
      });
    }
  }

  useEffect(() => {
    loadRequestsData();
  }, []);

  // Filter requests based on search text and filter
  const filteredRequests = requests.filter((request) => {
    const searchLower = searchText.toLowerCase();
    const matchesSearch =
      request.id.toLowerCase().includes(searchLower) ||
      request.description.toLowerCase().includes(searchLower) ||
      request.message.toLowerCase().includes(searchLower);

    const hasSecrets = (relatedSecretsMap[request.id] || []).length > 0;

    let matchesFilter = true;
    if (filter === "with-secrets") {
      matchesFilter = hasSecrets;
    } else if (filter === "waiting-for-secrets") {
      matchesFilter = !hasSecrets;
    }

    return matchesSearch && matchesFilter;
  });

  const renderRequestItem = (request: SecretRequest) => {
    const relatedSecrets = relatedSecretsMap[request.id] || [];
    const hasSecrets = relatedSecrets.length > 0;

    return (
      <List.Item
        key={request.id}
        title={request.description}
        accessories={[
          ...(hasSecrets
            ? [
                {
                  icon: Icon.Fingerprint,
                  tooltip: "Has related secret",
                },
              ]
            : []),
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="View Details"
                icon={Icon.Document}
                onAction={() => {
                  import("../components/SecretRequestDetail").then(({ default: SecretRequestDetail }) => {
                    push(<SecretRequestDetail request={request} onDelete={deleteRequest} />);
                  });
                }}
              />
              <Action title="Copy URL" icon={Icon.CopyClipboard} onAction={() => copyRequestUrl(request)} />
              <Action title="Open in Web" icon={Icon.Globe} onAction={() => openRequest(request)} />
              {hasSecrets && (
                <Action
                  title="View Secret Details"
                  icon={Icon.Fingerprint}
                  onAction={() => openRelatedSecret(request.id)}
                />
              )}
              <Action
                title="Delete Request"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteRequest(request.id)}
              />
            </ActionPanel.Section>
            <CreateActions push={push} />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search secret requests..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter requests"
          value={filter}
          onChange={(newValue) => setFilter(newValue as "all" | "with-secrets" | "waiting-for-secrets")}
        >
          <List.Dropdown.Item title="All Requests" value="all" />
          <List.Dropdown.Item title="Secrets Submitted" value="with-secrets" />
          <List.Dropdown.Item title="Awaiting Secrets" value="waiting-for-secrets" />
        </List.Dropdown>
      }
    >
      {filteredRequests.map(renderRequestItem)}
    </List>
  );
}
