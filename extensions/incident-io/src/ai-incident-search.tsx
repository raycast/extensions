import { Action, ActionPanel, List, Toast, getPreferenceValues, showToast, Icon, Color } from "@raycast/api";
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
      showToast({
        style: Toast.Style.Failure,
        title: "Search Error",
        message: error,
      });
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
      searchBarPlaceholder="Describe incidents in natural language..."
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
          <List.Item
            title="Parsed Query"
            subtitle={`Keywords: ${parsedQuery.keywords.join(", ") || "none"}`}
            accessories={[
              { text: parsedQuery.status ? `Status: ${parsedQuery.status.join(", ")}` : "" },
              { text: parsedQuery.severity ? `Severity: ${parsedQuery.severity.join(", ")}` : "" },
            ]}
          />
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
          description="Try describing what you're looking for in natural language"
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
