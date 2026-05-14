import { Action, ActionPanel, List, getPreferenceValues, Icon, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { useAIIncidentSearch } from "./hooks/useAIIncidentSearch";

interface Preferences {
  apiKey: string;
}

export default function AIIncidentSearchCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { incidents, loading, error, parsedQuery, searchWithAI } = useAIIncidentSearch(preferences.apiKey);

  useEffect(() => {
    if (error) {
      showFailureToast(error, { title: "Search Error" });
    }
  }, [error]);

  async function handleSearch() {
    await searchWithAI(searchQuery);
  }

  function getStatusIcon(status: string) {
    switch (status.toLowerCase()) {
      case "active":
        return { source: Icon.Circle, tintColor: Color.Red };
      case "resolved":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "closed":
        return { source: Icon.XMarkCircle, tintColor: Color.SecondaryText };
      default:
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }
  }

  function getSeverityBadge(severity?: string) {
    if (!severity || typeof severity !== "string") return null;

    const colors: Record<string, Color> = {
      critical: Color.Red,
      major: Color.Orange,
      minor: Color.Yellow,
      info: Color.Blue,
    };

    return {
      value: severity.toUpperCase(),
      color: colors[severity.toLowerCase()] || Color.SecondaryText,
    };
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Describe what you're looking for (e.g., database errors, API failures)..."
      searchText={searchQuery}
      onSearchTextChange={setSearchQuery}
      actions={
        <ActionPanel>
          <Action title="Search with AI" onAction={handleSearch} shortcut={{ modifiers: ["cmd"], key: "return" }} />
        </ActionPanel>
      }
    >
      {parsedQuery && (
        <List.Section title="AI Understanding">
          <List.Item title="Search Keywords" subtitle={`${parsedQuery.keywords.join(", ") || "none"}`} />
        </List.Section>
      )}

      {incidents.length > 0 && (
        <List.Section title={`Found ${incidents.length} incidents`}>
          {incidents.map((incident) => {
            const severityBadge = getSeverityBadge(incident.severity);
            return (
              <List.Item
                key={incident.id}
                title={incident.name || "No Title"}
                subtitle={new Date(incident.created_at).toLocaleString()}
                icon={getStatusIcon(incident.status)}
                accessories={[
                  ...(severityBadge ? [{ tag: severityBadge }] : []),
                  { text: incident.status },
                  ...(incident.summary ? [{ icon: Icon.Document }] : []),
                ]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open in Browser" url={incident.permalink} />
                    <Action title="Search Again" onAction={handleSearch} shortcut={{ modifiers: ["cmd"], key: "r" }} />
                    {incident.summary && (
                      <Action.CopyToClipboard
                        title="Copy Summary"
                        content={incident.summary}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {!loading && incidents.length === 0 && searchQuery && (
        <List.EmptyView
          title="No incidents found"
          description="Try using different keywords to describe the incidents you're looking for"
          actions={
            <ActionPanel>
              <Action title="Search with AI" onAction={handleSearch} shortcut={{ modifiers: ["cmd"], key: "return" }} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
