import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { executeQuery } from "./lib/database";
import {
  addQueryToHistory,
  getDatabases,
  getSavedQueries,
  addSavedQuery,
  updateSavedQuery,
  deleteSavedQuery,
} from "./lib/storage";
import { SavedQuery, Database, QueryResult } from "./lib/types";
import { formatExecutionTime, formatValue, getRowIdentifier } from "./lib/utils";

export default function SavedQueries() {
  const { data: queries = [], isLoading, revalidate } = useCachedPromise(getSavedQueries);
  const { data: databases = [] } = useCachedPromise(getDatabases);
  const [searchText, setSearchText] = useState("");

  async function handleDelete(query: SavedQuery) {
    if (
      await confirmAlert({
        title: "Delete Saved Query",
        message: `Are you sure you want to delete "${query.name}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await deleteSavedQuery(query.id);
      await showToast({ style: Toast.Style.Success, title: "Query deleted" });
      revalidate();
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={queries.length > 0}
      searchBarPlaceholder="Search saved queries..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {queries.length === 0 ? (
        <List.EmptyView
          title="No saved queries"
          description="Add a new query to get started"
          icon={Icon.Code}
          actions={
            <ActionPanel>
              <Action.Push title="Add Query" target={<SavedQueryForm databases={databases} onSave={revalidate} />} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Item
            title="Add New Query"
            icon={Icon.Plus}
            detail={<List.Item.Detail markdown="Add a new saved query" />}
            actions={
              <ActionPanel>
                <Action.Push title="Add Query" target={<SavedQueryForm databases={databases} onSave={revalidate} />} />
              </ActionPanel>
            }
          />
          {queries.map((query) => (
            <List.Item
              key={query.id}
              title={query.name}
              subtitle={query.databaseName}
              accessories={[{ date: new Date(query.updatedAt) }]}
              icon={Icon.Code}
              detail={<List.Item.Detail markdown={`\`\`\`sql\n${query.query}\n\`\`\``} />}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Execute Query"
                    icon={Icon.Play}
                    target={<QueryResults query={query} databases={databases} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy Query"
                    content={query.query}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  <Action.Push
                    title="Edit Query"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "u" }}
                    target={<SavedQueryForm databases={databases} query={query} onSave={revalidate} />}
                  />
                  <Action
                    title="Delete Query"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleDelete(query)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}

function SavedQueryForm({
  databases,
  query,
  onSave,
}: {
  databases: Database[];
  query?: SavedQuery;
  onSave: () => void;
}) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string>();
  const [queryError, setQueryError] = useState<string>();

  async function handleSubmit(values: { name: string; query: string; databaseId: string }) {
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }
    if (!values.query.trim()) {
      setQueryError("Query is required");
      return;
    }

    const database = databases.find((db) => db.id === values.databaseId);
    if (!database) {
      await showToast({ style: Toast.Style.Failure, title: "Database not found" });
      return;
    }

    if (query) {
      await updateSavedQuery(query.id, {
        name: values.name.trim(),
        query: values.query.trim(),
        databaseId: values.databaseId,
        databaseName: database.name,
      });
      await showToast({ style: Toast.Style.Success, title: "Query updated" });
    } else {
      await addSavedQuery({
        id: uuidv4(),
        name: values.name.trim(),
        query: values.query.trim(),
        databaseId: values.databaseId,
        databaseName: database.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await showToast({ style: Toast.Style.Success, title: "Query saved" });
    }

    onSave();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={query ? "Update Query" : "Save Query"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Active Users Query"
        defaultValue={query?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.Dropdown id="databaseId" title="Database" defaultValue={query?.databaseId || databases[0]?.id}>
        {databases.map((db) => (
          <Form.Dropdown.Item key={db.id} value={db.id} title={db.name} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="query"
        title="SQL Query"
        placeholder="SELECT * FROM users WHERE active = true"
        defaultValue={query?.query}
        error={queryError}
        onChange={() => setQueryError(undefined)}
        enableMarkdown={false}
      />
    </Form>
  );
}

function QueryResults({ query, databases }: { query: SavedQuery; databases: Database[] }) {
  const [results, setResults] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function run() {
      const database = databases.find((db) => db.id === query.databaseId);
      if (!database) {
        await showToast({ style: Toast.Style.Failure, title: "Database not found" });
        setIsLoading(false);
        return;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: "Executing query..." });

      try {
        const result = await executeQuery(database.connectionString, query.query, database.isReadonly);
        setResults(result);

        await addQueryToHistory({
          id: uuidv4(),
          query: query.query,
          databaseId: database.id,
          databaseName: database.name,
          executedAt: new Date().toISOString(),
          rowCount: result.rowCount,
        });

        toast.style = Toast.Style.Success;
        toast.title = "Query executed";
        toast.message = `${result.rowCount} rows in ${formatExecutionTime(result.executionTime)}`;
      } catch (error) {
        await addQueryToHistory({
          id: uuidv4(),
          query: query.query,
          databaseId: database.id,
          databaseName: database.name,
          executedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error",
        });

        toast.style = Toast.Style.Failure;
        toast.title = "Query failed";
        toast.message = error instanceof Error ? error.message : "Unknown error";
      } finally {
        setIsLoading(false);
      }
    }
    run();
  }, []);

  if (!results) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView title="Executing query..." icon={Icon.Clock} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={query.name}
      searchBarPlaceholder="Filter results..."
      filtering
    >
      {results.rowCount === 0 ? (
        <List.EmptyView title="No results" description="The query returned no rows" icon={Icon.MagnifyingGlass} />
      ) : (
        results.rows.map((row, i) => (
          <List.Item
            key={i}
            title={getRowIdentifier(row)}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    {Object.keys(row).map((col) => (
                      <List.Item.Detail.Metadata.Label key={col} title={col} text={formatValue(row[col])} />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Row as JSON" content={JSON.stringify(row, null, 2)} />
                <Action.CopyToClipboard
                  title="Copy All Results as JSON"
                  content={JSON.stringify(results.rows, null, 2)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
