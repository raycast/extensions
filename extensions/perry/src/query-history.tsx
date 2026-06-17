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
  addSavedQuery,
  clearQueryHistory,
  deleteQueryFromHistory,
  getDatabases,
  getQueryHistory,
} from "./lib/storage";
import { QueryHistory, Database, QueryResult } from "./lib/types";
import { formatExecutionTime, formatQueryForDisplay, formatValue, getRowIdentifier } from "./lib/utils";

export default function QueryHistoryCommand() {
  const { data: history = [], isLoading, revalidate } = useCachedPromise(getQueryHistory);
  const { data: databases = [] } = useCachedPromise(getDatabases);
  const [searchText, setSearchText] = useState("");

  async function handleDeleteItem(item: QueryHistory) {
    if (
      await confirmAlert({
        title: "Delete Query from History",
        message: "Are you sure you want to remove this query from history?",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await deleteQueryFromHistory(item.id);
      await showToast({ style: Toast.Style.Success, title: "Query removed from history" });
      revalidate();
    }
  }

  async function handleClearAll() {
    if (
      await confirmAlert({
        title: "Clear All History",
        message: "Are you sure you want to delete all query history? This cannot be undone.",
        primaryAction: { title: "Clear All", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await clearQueryHistory();
      await showToast({ style: Toast.Style.Success, title: "History cleared" });
      revalidate();
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search query history..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {history.length === 0 ? (
        <List.EmptyView title="No query history" description="Execute queries to see them here" />
      ) : (
        history.map((item) => (
          <List.Item
            key={item.id}
            title={formatQueryForDisplay(item.query)}
            subtitle={item.databaseName}
            accessories={[
              { date: new Date(item.executedAt) },
              { text: item.rowCount !== undefined ? `${item.rowCount} rows` : undefined },
              { icon: item.error ? Icon.ExclamationMark : Icon.Check },
            ]}
            icon={Icon.Document}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Re-Run Query"
                  icon={Icon.Play}
                  target={<QueryResults historyItem={item} databases={databases} onExecute={revalidate} />}
                />
                <Action.CopyToClipboard title="Copy Query" content={item.query} />
                <Action.Push
                  title="Save as Saved Query"
                  icon={Icon.SaveDocument}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  target={<SaveQueryForm historyItem={item} databases={databases} onSave={revalidate} />}
                />
                <Action
                  title="Delete from History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => handleDeleteItem(item)}
                />
                <Action
                  title="Clear All History"
                  icon={Icon.ExclamationMark}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={handleClearAll}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function QueryResults({
  historyItem,
  databases,
  onExecute,
}: {
  historyItem: QueryHistory;
  databases: Database[];
  onExecute: () => void;
}) {
  const [results, setResults] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function run() {
      const database = databases.find((db) => db.id === historyItem.databaseId);
      if (!database) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Database not found",
          message: "The database for this query no longer exists",
        });
        setIsLoading(false);
        return;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: "Executing query..." });

      try {
        const result = await executeQuery(database.connectionString, historyItem.query, database.isReadonly);
        setResults(result);

        await addQueryToHistory({
          id: uuidv4(),
          query: historyItem.query,
          databaseId: database.id,
          databaseName: database.name,
          executedAt: new Date().toISOString(),
          rowCount: result.rowCount,
        });

        toast.style = Toast.Style.Success;
        toast.title = "Query executed";
        toast.message = `${result.rowCount} rows in ${formatExecutionTime(result.executionTime)}`;
        onExecute();
      } catch (error) {
        await addQueryToHistory({
          id: uuidv4(),
          query: historyItem.query,
          databaseId: database.id,
          databaseName: database.name,
          executedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error",
        });

        toast.style = Toast.Style.Failure;
        toast.title = "Query failed";
        toast.message = error instanceof Error ? error.message : "Unknown error";
        onExecute();
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
      navigationTitle="Query Results"
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

function SaveQueryForm({
  historyItem,
  databases,
  onSave,
}: {
  historyItem: QueryHistory;
  databases: Database[];
  onSave: () => void;
}) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string>();

  async function handleSubmit(values: { name: string }) {
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }

    const database = databases.find((db) => db.id === historyItem.databaseId);
    if (!database) {
      await showToast({ style: Toast.Style.Failure, title: "Database not found" });
      return;
    }

    await addSavedQuery({
      id: uuidv4(),
      name: values.name.trim(),
      query: historyItem.query,
      databaseId: historyItem.databaseId,
      databaseName: historyItem.databaseName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await showToast({ style: Toast.Style.Success, title: "Query saved" });
    onSave();
    pop();
  }

  return (
    <Form
      navigationTitle="Save Query"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Query" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Query Name"
        placeholder="Active Users Query"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.Description title="Query" text={historyItem.query} />
      <Form.Description title="Database" text={historyItem.databaseName} />
    </Form>
  );
}
