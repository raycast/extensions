import { List, ActionPanel, Action, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useMemo } from "react";
import { useKubeconfig } from "./hooks/useKubeconfig";
import { searchAndFilterContexts, addRecentContext, SearchFilters } from "./utils/search-filter";
import { ContextDetails } from "./components/ContextDetails";

export default function ListContexts() {
  const { contexts, isLoading, error, switchContext } = useKubeconfig();
  const [searchQuery, setSearchQuery] = useState("");

  // Apply search with advanced filtering
  const searchResults = useMemo(() => {
    const filters: SearchFilters = { query: searchQuery };
    return searchAndFilterContexts(contexts, filters);
  }, [contexts, searchQuery]);

  const handleSwitchContext = async (contextName: string) => {
    try {
      const success = await switchContext(contextName);
      if (success) {
        addRecentContext(contextName);
        await showToast({
          style: Toast.Style.Success,
          title: "Context Switched",
          message: `Switched to: ${contextName}`,
        });
        // Go back to Raycast main command list
        await popToRoot();
      } else {
        await showFailureToast("Context switch failed", {
          title: "Failed to switch context",
          message: `Could not switch to context '${contextName}'`,
        });
      }
    } catch (err) {
      await showFailureToast(err as Error, {
        title: "Failed to switch context",
      });
    }
  };

  if (error) {
    return (
      <List>
        <List.Item title="Error Loading Contexts" subtitle={error.message} accessories={[{ text: "❌" }]} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchQuery}
      onSearchTextChange={setSearchQuery}
      searchBarPlaceholder="Search contexts by name, cluster, user, or namespace..."
    >
      {searchResults.map(({ context, relevanceScore, matchedFields }) => (
        <List.Item
          key={context.name}
          icon={context.current ? Icon.CheckCircle : Icon.Circle}
          title={context.name}
          subtitle={`Cluster: ${context.cluster} • User: ${context.user}${context.clusterDetails ? ` • ${context.clusterDetails.hostname}:${context.clusterDetails.port}` : ""}`}
          accessories={[
            {
              text: `ns: ${context.namespace || "default"}`,
              tooltip: "Namespace",
            },
            {
              text: context.userAuthMethod || "Unknown",
              tooltip: "Authentication Method",
            },
            ...(context.clusterDetails
              ? [
                  {
                    text: context.clusterDetails.protocol,
                    tooltip: `${context.clusterDetails.isSecure ? "Secure" : "Insecure"} connection`,
                  },
                ]
              : []),
            ...(searchQuery
              ? [
                  {
                    text: `${relevanceScore.toFixed(0)}%`,
                    tooltip: `Relevance (matched: ${matchedFields.join(", ")})`,
                  },
                ]
              : []),
            {
              text: context.current ? "●" : "",
              tooltip: context.current ? "Current context" : undefined,
            },
          ]}
          actions={
            <ActionPanel>
              {!context.current && (
                <Action
                  title={`Switch to ${context.name}`}
                  icon={Icon.ArrowRight}
                  onAction={() => handleSwitchContext(context.name)}
                />
              )}
              {context.current && (
                <Action
                  title="Current Context"
                  icon={Icon.CheckCircle}
                  onAction={() =>
                    showToast({
                      style: Toast.Style.Success,
                      title: "Current Context",
                      message: `Already using ${context.name}`,
                    })
                  }
                />
              )}
              <Action.Push
                title={`View ${context.name} Details`}
                icon={Icon.Info}
                target={<ContextDetails context={context} />}
              />
            </ActionPanel>
          }
        />
      ))}
      {searchResults.length === 0 && !isLoading && (
        <List.Item
          title="No Matching Contexts"
          subtitle={searchQuery ? `No contexts match "${searchQuery}"` : "Check your ~/.kube/config file"}
          accessories={[{ text: searchQuery ? "🔍" : "⚠️" }]}
        />
      )}
    </List>
  );
}
