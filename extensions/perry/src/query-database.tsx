import React, { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useDatabases, useQueryExecution, useSchemaCache } from "./hooks/useDatabase";
import { formatValue, getRowIdentifier } from "./lib/utils";
import {
  extractTableNameFromQuery,
  filterSuggestions,
  getSQLContext,
  getSQLKeywordSuggestions,
} from "./lib/sql-parser";

export default function QueryDatabase() {
  const { databases, activeDatabase, activeDatabaseId, setActiveDatabaseId, isLoading: isLoadingDbs } = useDatabases();
  const { execute, results, isExecuting, clear } = useQueryExecution(activeDatabase);
  const { tables, columns, isLoading: isLoadingSchema } = useSchemaCache(activeDatabase?.connectionString);

  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateSuggestions(), 100);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText, tables, columns]);

  function updateSuggestions() {
    if (!searchText) {
      setSuggestions(["SELECT", "INSERT INTO", "UPDATE", "DELETE FROM", "CREATE TABLE"]);
      return;
    }

    if (tables.length === 0 && columns.length === 0) return;

    const { context, partial } = getSQLContext(searchText);

    if (context === "keyword") {
      setSuggestions(getSQLKeywordSuggestions(partial));
    } else if (context === "table") {
      setSuggestions(filterSuggestions(tables, partial));
    } else if (context === "column") {
      const tableName = extractTableNameFromQuery(searchText);
      if (tableName) {
        const tableColumns = columns.filter((c) => c.tableName === tableName).map((c) => c.columnName);
        setSuggestions(
          filterSuggestions(
            tableColumns.length > 0 ? tableColumns : [...new Set(columns.map((c) => c.columnName))],
            partial,
          ),
        );
      } else {
        setSuggestions(["*"]);
      }
    } else {
      setSuggestions([]);
    }
  }

  function applySuggestion(suggestion: string) {
    const { context, partial } = getSQLContext(searchText);

    if (context === "keyword") {
      const before = partial ? searchText.slice(0, -partial.length) : searchText;
      setSearchText(before + suggestion + " ");
    } else if (context === "table") {
      const upper = searchText.toUpperCase();
      const fromIdx = upper.lastIndexOf(" FROM");
      const joinIdx = Math.max(
        upper.lastIndexOf(" JOIN"),
        upper.lastIndexOf(" INNER JOIN"),
        upper.lastIndexOf(" LEFT JOIN"),
        upper.lastIndexOf(" RIGHT JOIN"),
      );
      const lastIdx = Math.max(fromIdx, joinIdx);

      if (lastIdx !== -1) {
        const keywordLen = fromIdx > joinIdx ? 5 : searchText.slice(lastIdx).indexOf(" JOIN") + 5;
        setSearchText(searchText.slice(0, lastIdx + keywordLen + 1) + suggestion + " ");
      } else {
        setSearchText(searchText + suggestion + " ");
      }
    } else if (context === "column") {
      const dotMatch = searchText.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\.([\w]*)$/);
      if (dotMatch) {
        setSearchText(searchText.slice(0, searchText.lastIndexOf(".") + 1) + suggestion + " ");
      } else if (partial) {
        const before = searchText.slice(0, -partial.length);
        const isSelect = searchText.toUpperCase().includes("SELECT") && !searchText.toUpperCase().includes("FROM");
        setSearchText(before + suggestion + (isSelect ? ", " : " "));
      } else {
        setSearchText(searchText + suggestion + " ");
      }
    }
    setSuggestions([]);
  }

  if (databases.length === 0 && !isLoadingDbs) {
    return (
      <List>
        <List.EmptyView
          title="No databases configured"
          description="Use 'Manage Databases' to add a PostgreSQL connection"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isExecuting || isLoadingSchema}
      isShowingDetail={results != null && results.rowCount > 0}
      searchBarPlaceholder="SELECT * FROM users WHERE..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Database" value={activeDatabaseId} onChange={setActiveDatabaseId}>
          {databases.map((db) => (
            <List.Dropdown.Item key={db.id} value={db.id} title={db.name} />
          ))}
        </List.Dropdown>
      }
    >
      {suggestions.length > 0 && (
        <List.Section title="Suggestions">
          {suggestions.map((s, i) => (
            <List.Item
              key={i}
              title={s}
              icon={Icon.Wand}
              actions={
                <ActionPanel>
                  <Action title="Apply Suggestion" icon={Icon.Check} onAction={() => applySuggestion(s)} />
                  <Action
                    title="Execute Query"
                    icon={Icon.Play}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => execute(searchText)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {!results || results.rowCount === 0 ? (
        <List.EmptyView
          title={results ? "No results" : "Enter a SQL query"}
          description={results ? "The query returned no rows" : "Type your SQL query in the search bar and press Enter"}
          icon={Icon.MagnifyingGlass}
          actions={
            searchText ? (
              <ActionPanel>
                <Action title="Execute Query" icon={Icon.Play} onAction={() => execute(searchText)} />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : (
        results.rows.map((row, i) => (
          <List.Item
            key={i}
            title={getRowIdentifier(row, results.fields)}
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
                <Action title="Execute Query" icon={Icon.Play} onAction={() => execute(searchText)} />
                <Action.CopyToClipboard title="Copy Row as JSON" content={JSON.stringify(row, null, 2)} />
                <Action.CopyToClipboard
                  title="Copy All Results as JSON"
                  content={JSON.stringify(results.rows, null, 2)}
                />
                <Action
                  title="Clear"
                  icon={Icon.Trash}
                  onAction={() => {
                    setSearchText("");
                    clear();
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
