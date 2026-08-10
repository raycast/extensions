import { Action, ActionPanel, List, launchCommand, LaunchType, type LaunchProps, Icon } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDatabases, getDefaultDatabase, type StoredDatabase } from "./lib/databases";
import { readSchemaCache, type SchemaCache, type TableCacheEntry } from "./lib/cache";
import { filterTables, getExclusionRules, type ExclusionRule } from "./lib/exclusion";

type ExploreLaunchContext = { databaseId?: string };

function tableEntries(cache: SchemaCache): { key: string; entry: TableCacheEntry }[] {
  return Object.entries(cache.tables).map(([key, entry]) => ({ key, entry }));
}

function groupBySchema(
  items: { key: string; entry: TableCacheEntry }[],
): Map<string, { key: string; entry: TableCacheEntry }[]> {
  const map = new Map<string, { key: string; entry: TableCacheEntry }[]>();
  for (const item of items) {
    const schema = item.key.includes(".") ? item.key.split(".")[0]! : "public";
    const list = map.get(schema) ?? [];
    list.push(item);
    map.set(schema, list);
  }
  return map;
}

type InitState = "loading" | "no-databases" | "picking" | "ready";

export default function Command(props: LaunchProps<{ launchContext?: ExploreLaunchContext }>) {
  const launchDbId = props.launchContext?.databaseId;
  const [initState, setInitState] = useState<InitState>("loading");
  const [databases, setDatabases] = useState<StoredDatabase[]>([]);
  const [activeDbId, setActiveDbId] = useState<string | null>(null);
  const [cache, setCache] = useState<SchemaCache | null>(null);
  const [exclusionRules, setExclusionRules] = useState<ExclusionRule[]>([]);
  const [selectedTableKeys, setSelectedTableKeys] = useState<Set<string>>(new Set());
  const loadSeqRef = useRef(0);

  const loadDataForDb = useCallback(async (dbId: string) => {
    const seq = ++loadSeqRef.current;
    const [cacheData, rules] = await Promise.all([Promise.resolve(readSchemaCache(dbId)), getExclusionRules(dbId)]);
    if (seq !== loadSeqRef.current) return;
    setCache(cacheData);
    setExclusionRules(rules);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await getDatabases();
      if (cancelled) return;
      setDatabases(list);
      if (list.length === 0) {
        setInitState("no-databases");
        return;
      }
      const dbToSelect =
        launchDbId && list.some((d) => d.id === launchDbId)
          ? list.find((d) => d.id === launchDbId)!
          : await getDefaultDatabase();
      if (dbToSelect) {
        setActiveDbId(dbToSelect.id);
        await loadDataForDb(dbToSelect.id);
        if (cancelled) return;
        setInitState("ready");
      } else {
        setInitState("picking");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDataForDb, launchDbId]);

  const onDatabaseChange = useCallback(
    (dbId: string) => {
      setActiveDbId(dbId);
      setCache(null);
      setExclusionRules([]);
      setSelectedTableKeys(new Set());
      loadDataForDb(dbId);
    },
    [loadDataForDb],
  );

  const toggleTableSelection = useCallback((key: string) => {
    setSelectedTableKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedTableKeys(new Set()), []);

  const refresh = useCallback(() => {
    if (activeDbId) {
      setSelectedTableKeys(new Set());
      loadDataForDb(activeDbId);
    }
  }, [activeDbId, loadDataForDb]);

  const allItems = useMemo(() => (cache ? tableEntries(cache) : []), [cache]);
  const items = useMemo(() => filterTables(allItems, exclusionRules), [allItems, exclusionRules]);
  const bySchema = useMemo(() => groupBySchema(items), [items]);
  const sortedSchemas = useMemo(() => Array.from(bySchema.keys()).sort(), [bySchema]);
  const activeDb = useMemo(() => databases.find((d) => d.id === activeDbId) ?? null, [databases, activeDbId]);
  const showTableNamesOnly = activeDb?.showTableNamesOnly === true;

  const { selectedOrderedKeys, combinedDdl } = useMemo(() => {
    const ordered: string[] = [];
    const ddls: string[] = [];
    for (const schema of sortedSchemas) {
      const schemaItems = bySchema.get(schema) ?? [];
      for (const { key, entry } of schemaItems) {
        if (selectedTableKeys.has(key)) {
          ordered.push(key);
          ddls.push(entry.ddl);
        }
      }
    }
    return {
      selectedOrderedKeys: ordered,
      combinedDdl: ddls.join("\n\n"),
    };
  }, [bySchema, sortedSchemas, selectedTableKeys]);

  const fullSchemaDdl = useMemo(() => {
    const ddls: string[] = [];
    for (const schema of sortedSchemas) {
      const schemaItems = bySchema.get(schema) ?? [];
      for (const { entry } of schemaItems) {
        ddls.push(entry.ddl);
      }
    }
    return ddls.join("\n\n");
  }, [bySchema, sortedSchemas]);

  const addAllToSelection = useCallback(() => {
    setSelectedTableKeys(new Set(items.map((i) => i.key)));
  }, [items]);

  const addSchemaToSelection = useCallback(
    (schema: string) => {
      setSelectedTableKeys((prev) => {
        const next = new Set(prev);
        for (const { key } of bySchema.get(schema) ?? []) next.add(key);
        return next;
      });
    },
    [bySchema],
  );

  const removeSchemaFromSelection = useCallback(
    (schema: string) => {
      setSelectedTableKeys((prev) => {
        const next = new Set(prev);
        for (const { key } of bySchema.get(schema) ?? []) next.delete(key);
        return next;
      });
    },
    [bySchema],
  );

  if (initState === "loading") {
    return (
      <List>
        <List.EmptyView title="Loading…" description="Loading databases and schema" />
      </List>
    );
  }

  if (initState === "no-databases") {
    return (
      <List>
        <List.EmptyView
          title="No databases"
          description="Add a database in Manage Databases first."
          icon={Icon.Plug}
          actions={
            <ActionPanel>
              <Action
                title="Manage Databases"
                onAction={() => launchCommand({ name: "manage-databases", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (initState === "picking" && databases.length > 0) {
    return (
      <List
        searchBarPlaceholder="Pick a database..."
        actions={
          <ActionPanel>
            <Action
              title="Manage Databases"
              onAction={() => launchCommand({ name: "manage-databases", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      >
        {databases.map((db) => (
          <List.Item
            key={db.id}
            title={db.name}
            subtitle={db.lastSyncedAt ? `Last synced: ${new Date(db.lastSyncedAt).toLocaleString()}` : "Never synced"}
            actions={
              <ActionPanel>
                <Action
                  title="Open Tables"
                  onAction={() => {
                    setActiveDbId(db.id);
                    loadDataForDb(db.id);
                    setInitState("ready");
                  }}
                />
                <Action
                  title="Manage Databases"
                  onAction={() => launchCommand({ name: "manage-databases", type: LaunchType.UserInitiated })}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  if (initState === "ready" && activeDb) {
    const hasCredentials = !!activeDb.connectionString?.trim();
    if (!hasCredentials) {
      return (
        <List>
          <List.EmptyView
            title="No credentials for this database"
            description="Open Manage Databases and edit credentials for this database."
            icon={Icon.Plug}
            actions={
              <ActionPanel>
                <Action
                  title="Manage Databases"
                  onAction={() => launchCommand({ name: "manage-databases", type: LaunchType.UserInitiated })}
                />
              </ActionPanel>
            }
          />
        </List>
      );
    }

    if (!cache || allItems.length === 0) {
      return (
        <List>
          <List.EmptyView
            title={cache ? "No tables" : "No schema cached"}
            description={
              cache
                ? "Database has no tables or views, or all are excluded."
                : "Run Sync Schema for this database, or open Manage Databases."
            }
            icon={Icon.Document}
            actions={
              <ActionPanel>
                <Action
                  title="Manage Databases"
                  onAction={() => launchCommand({ name: "manage-databases", type: LaunchType.UserInitiated })}
                />
                <Action
                  title="Sync Schema"
                  onAction={() => launchCommand({ name: "sync-schema", type: LaunchType.UserInitiated })}
                />
              </ActionPanel>
            }
          />
        </List>
      );
    }

    if (items.length === 0 && allItems.length > 0) {
      return (
        <List>
          <List.EmptyView
            title="All tables excluded"
            description="Adjust exclusion rules in Manage Databases for this database."
            icon={Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action
                  title="Manage Databases"
                  onAction={() => launchCommand({ name: "manage-databases", type: LaunchType.UserInitiated })}
                />
                <Action title="Refresh" onAction={refresh} />
              </ActionPanel>
            }
          />
        </List>
      );
    }

    return (
      <List
        isShowingDetail
        searchBarPlaceholder={
          selectedOrderedKeys.length > 0
            ? `Search tables… (${selectedOrderedKeys.length} selected)`
            : "Search tables..."
        }
        searchBarAccessory={
          databases.length > 1 ? (
            <List.Dropdown tooltip="Database" value={activeDbId ?? ""} onChange={onDatabaseChange}>
              {databases.map((db) => (
                <List.Dropdown.Item key={db.id} title={db.name} value={db.id} />
              ))}
            </List.Dropdown>
          ) : undefined
        }
        filtering={true}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title={`Copy Full Schema (${items.length} Tables)`} content={fullSchemaDdl} />
            {selectedOrderedKeys.length > 0 && (
              <>
                <Action.CopyToClipboard
                  title={`Copy Combined DDL (${selectedOrderedKeys.length} Tables)`}
                  content={combinedDdl}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  onCopy={clearSelection}
                />
                <Action title="Clear Selection" onAction={clearSelection} />
              </>
            )}
            <Action title="Add All to Selection" onAction={addAllToSelection} />
            <Action title="Refresh" onAction={refresh} />
            <Action
              title="Manage Databases"
              onAction={() => launchCommand({ name: "manage-databases", type: LaunchType.UserInitiated })}
            />
            <Action
              title="Sync Schema"
              onAction={() => launchCommand({ name: "sync-schema", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      >
        {sortedSchemas.map((schema) => (
          <List.Section key={schema} title={schema}>
            {(bySchema.get(schema) ?? []).map(({ key, entry }) => {
              const displayTitle = showTableNamesOnly && key.includes(".") ? key.split(".").slice(1).join(".") : key;
              const isSelected = selectedTableKeys.has(key);
              const markdown = `\`\`\`sql\n${entry.ddl}\n\`\`\``;
              return (
                <List.Item
                  key={key}
                  title={displayTitle}
                  accessoryTitle={isSelected ? "✓ Selected" : undefined}
                  detail={<List.Item.Detail markdown={markdown} />}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy DDL" content={entry.ddl} />
                      <Action
                        title={isSelected ? "Remove from Selection" : "Add to Selection"}
                        onAction={() => toggleTableSelection(key)}
                      />
                      <Action.CopyToClipboard
                        title={`Copy Full Schema (${items.length} Tables)`}
                        content={fullSchemaDdl}
                      />
                      {selectedOrderedKeys.length > 0 && (
                        <>
                          <Action.CopyToClipboard
                            title={`Copy Combined DDL (${selectedOrderedKeys.length} Tables)`}
                            content={combinedDdl}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                            onCopy={clearSelection}
                          />
                          <Action title="Clear Selection" onAction={clearSelection} />
                        </>
                      )}
                      <Action title="Add Schema to Selection" onAction={() => addSchemaToSelection(schema)} />
                      <Action title="Remove Schema from Selection" onAction={() => removeSchemaFromSelection(schema)} />
                      <Action title="Refresh" onAction={refresh} />
                      <Action
                        title="Manage Databases"
                        onAction={() => launchCommand({ name: "manage-databases", type: LaunchType.UserInitiated })}
                      />
                      <Action
                        title="Sync Schema"
                        onAction={() => launchCommand({ name: "sync-schema", type: LaunchType.UserInitiated })}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))}
      </List>
    );
  }

  return (
    <List>
      <List.EmptyView title="Loading…" />
    </List>
  );
}
