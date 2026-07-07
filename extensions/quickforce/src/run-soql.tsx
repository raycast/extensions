import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { useCachedPromise } from "@raycast/utils";
import fs from "fs";
import os from "os";
import path from "path";
import {
  runSOQL,
  addQueryToHistory,
  getQueryHistory,
  getQueryFavorites,
  toggleQueryFavorite,
  deleteQueryFromHistory,
  SavedQuery,
} from "./lib/sfdx";
import { formatDate, recordsToCsv } from "./lib/utils";
import { useDefaultOrgSelection, useOrgOptions } from "./org-dropdown";

async function exportCsvToDownloads(records: Record<string, unknown>[]) {
  await showToast({ style: Toast.Style.Animated, title: "Exporting CSV…" });
  try {
    const csv = recordsToCsv(records);
    const fileName = `soql-export-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    const filePath = path.join(os.homedir(), "Downloads", fileName);
    await fs.promises.writeFile(filePath, csv);
    await showToast({
      style: Toast.Style.Success,
      title: "Exported to Downloads",
      message: fileName,
      primaryAction: { title: "Show in Finder", onAction: () => showInFinder(filePath) },
    });
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to export CSV", message: String(error) });
  }
}

function QueryResults({ query, org }: { query: string; org: string }) {
  const { data, isLoading, error } = useCachedPromise(runSOQL, [query, org]);

  // Auto-save query to history after successful execution
  useEffect(() => {
    if (data && !error) {
      addQueryToHistory(query, org);
    }
  }, [data, error, query, org]);

  useEffect(() => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Query Error", message: String(error) });
    }
  }, [error]);

  const fields = data?.records?.[0] ? Object.keys(data.records[0]).filter((k) => k !== "attributes") : [];

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={`Results: ${data?.totalSize || 0} records`}>
      {data?.records.map((record, index) => {
        const titleField = fields.find((f) => f.toLowerCase().includes("name")) || fields[1] || "Id";
        const title = record[titleField] || record.Id || `Record ${index + 1}`;

        return (
          <List.Item
            key={String(record.Id ?? index)}
            icon={Icon.Document}
            title={String(title)}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    {fields.map((field) => (
                      <List.Item.Detail.Metadata.Label key={field} title={field} text={String(record[field] ?? "")} />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy JSON" content={JSON.stringify(record, null, 2)} />
                <Action.CopyToClipboard
                  title="Copy Record Id"
                  content={String(record.Id ?? "")}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
                <Action.Push
                  title="Save Query to Favorites"
                  icon={Icon.Star}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  target={<AddQueryLabelForm query={query} org={org} onSave={() => {}} />}
                />
                <ActionPanel.Section title="Export">
                  <Action
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title="Export CSV to Downloads"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    onAction={() => exportCsvToDownloads(data?.records ?? [])}
                  />
                  <Action
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title="Copy as CSV"
                    icon={Icon.Clipboard}
                    onAction={async () => {
                      await Clipboard.copy(recordsToCsv(data?.records ?? []));
                      await showToast({ style: Toast.Style.Success, title: "Copied CSV to Clipboard" });
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && data?.records.length === 0 && (
        <List.EmptyView
          title="No Results"
          description="Your query returned no records"
          actions={
            <ActionPanel>
              <Action.Push
                title="Save Query to Favorites"
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                target={<AddQueryLabelForm query={query} org={org} onSave={() => {}} />}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

// Add Query Label Form
function AddQueryLabelForm({ query, org, onSave }: { query: string; org: string; onSave: () => void }) {
  const { pop } = useNavigation();
  const [label, setLabel] = useState("");

  const handleSubmit = async () => {
    if (!label.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter a label" });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Saving query..." });

    try {
      // Add to history with label
      await addQueryToHistory(query, org, label);
      // Get the newly added query from history and toggle favorite
      const history = await getQueryHistory();
      const newQuery = history.find((q) => q.query === query);
      if (newQuery) {
        await toggleQueryFavorite(newQuery.id);
      }

      await showToast({ style: Toast.Style.Success, title: "Query saved to favorites!" });
      onSave();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to save", message: String(error) });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Favorites" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={query.substring(0, 200) + (query.length > 200 ? "..." : "")} />
      <Form.TextField
        id="label"
        title="Label"
        placeholder="User Report Query"
        value={label}
        onChange={setLabel}
        info="Give this query a memorable name"
      />
    </Form>
  );
}

// Query History View
function QueryHistoryView({ onSelect }: { onSelect: (query: SavedQuery) => void }) {
  const { pop } = useNavigation();
  const [history, setHistory] = useState<SavedQuery[]>([]);
  const [favorites, setFavorites] = useState<SavedQuery[]>([]);

  useEffect(() => {
    loadQueries();
  }, []);

  async function loadQueries() {
    const h = await getQueryHistory();
    const f = await getQueryFavorites();
    setHistory(h);
    setFavorites(f);
  }

  async function handleDelete(queryId: string) {
    await deleteQueryFromHistory(queryId);
    await loadQueries();
    await showToast({ style: Toast.Style.Success, title: "Query deleted" });
  }

  async function handleToggleFavorite(queryId: string) {
    await toggleQueryFavorite(queryId);
    await loadQueries();
  }

  return (
    <List searchBarPlaceholder="Search saved queries...">
      {favorites.length > 0 && (
        <List.Section title="Favorites">
          {favorites.map((query) => (
            <List.Item
              key={query.id}
              icon={Icon.Star}
              title={query.label || query.query.substring(0, 60) + "..."}
              subtitle={formatDate(query.executedAt)}
              accessories={[{ text: query.org || "" }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Load Query"
                    icon={Icon.ArrowRight}
                    onAction={() => {
                      onSelect(query);
                      pop();
                    }}
                  />
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.StarDisabled}
                    onAction={() => handleToggleFavorite(query.id)}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(query.id)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {history.length > 0 && (
        <List.Section title="Recent Queries">
          {history.map((query) => (
            <List.Item
              key={query.id}
              icon={Icon.Clock}
              title={query.label || query.query.substring(0, 60) + "..."}
              subtitle={formatDate(query.executedAt)}
              accessories={[{ text: query.org || "" }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Load Query"
                    icon={Icon.ArrowRight}
                    onAction={() => {
                      onSelect(query);
                      pop();
                    }}
                  />
                  <Action title="Add to Favorites" icon={Icon.Star} onAction={() => handleToggleFavorite(query.id)} />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(query.id)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {history.length === 0 && favorites.length === 0 && (
        <List.EmptyView
          icon={Icon.Document}
          title="No Saved Queries"
          description="Execute queries to build up your history, or save favorites for quick access"
        />
      )}
    </List>
  );
}

export function SoqlForm({ initialOrg }: { initialOrg?: string } = {}) {
  const { push } = useNavigation();
  const [query, setQuery] = useState("SELECT Id, Name FROM Account LIMIT 10");
  const [queryHistory, setQueryHistory] = useState<SavedQuery[]>([]);
  const [queryFavorites, setQueryFavorites] = useState<SavedQuery[]>([]);

  const { selectedOrg, setSelectedOrg } = useDefaultOrgSelection(initialOrg);
  const orgOptions = useOrgOptions();

  // Load history and favorites on mount
  useEffect(() => {
    async function loadQueries() {
      const history = await getQueryHistory();
      const favorites = await getQueryFavorites();
      setQueryHistory(history);
      setQueryFavorites(favorites);
    }
    loadQueries();
  }, []);

  const handleLoadSavedQuery = (value: string) => {
    if (!value) return;

    const allQueries = [...queryFavorites, ...queryHistory];
    const selected = allQueries.find((q) => q.id === value);
    if (selected) {
      setQuery(selected.query);
      if (selected.org) {
        setSelectedOrg(selected.org);
      }
    }
  };

  const refreshQueries = async () => {
    const history = await getQueryHistory();
    const favorites = await getQueryFavorites();
    setQueryHistory(history);
    setQueryFavorites(favorites);
  };

  const handleRunQuery = async () => {
    if (!selectedOrg) {
      await showToast({ style: Toast.Style.Failure, title: "Select an org before running a query" });
      return;
    }

    push(<QueryResults query={query} org={selectedOrg} />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Run Query" icon={Icon.Play} onAction={handleRunQuery} />
          <ActionPanel.Section title="Save">
            <Action.Push
              title="Save to Favorites"
              icon={Icon.Star}
              target={<AddQueryLabelForm query={query} org={selectedOrg} onSave={refreshQueries} />}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Manage">
            <Action.Push
              title="View Query History"
              icon={Icon.List}
              target={
                <QueryHistoryView
                  onSelect={(q) => {
                    setQuery(q.query);
                    if (q.org) setSelectedOrg(q.org);
                  }}
                />
              }
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown id="org" title="Select Org" storeValue value={selectedOrg} onChange={setSelectedOrg}>
        {orgOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} icon={option.icon} />
        ))}
      </Form.Dropdown>

      {(queryFavorites.length > 0 || queryHistory.length > 0) && (
        <Form.Dropdown id="savedQueries" title="Load Saved Query" onChange={handleLoadSavedQuery}>
          <Form.Dropdown.Item key="none" value="" title="--Select a saved query--" />

          {queryFavorites.length > 0 && (
            <Form.Dropdown.Section title="Favorites">
              {queryFavorites.map((q) => (
                <Form.Dropdown.Item
                  key={q.id}
                  value={q.id}
                  title={q.label || q.query.substring(0, 50) + "..."}
                  icon={Icon.Star}
                />
              ))}
            </Form.Dropdown.Section>
          )}

          {queryHistory.length > 0 && (
            <Form.Dropdown.Section title="Recent Queries">
              {queryHistory.slice(0, 10).map((q) => (
                <Form.Dropdown.Item
                  key={q.id}
                  value={q.id}
                  title={q.label || q.query.substring(0, 50) + "..."}
                  icon={Icon.Clock}
                />
              ))}
            </Form.Dropdown.Section>
          )}
        </Form.Dropdown>
      )}

      <Form.TextArea
        id="query"
        title="SOQL Query"
        placeholder="SELECT Id, Name FROM Account LIMIT 10"
        value={query}
        onChange={setQuery}
      />
    </Form>
  );
}

export default function Command() {
  return <SoqlForm />;
}
