import { Action, ActionPanel, List, showToast, Toast, launchCommand, LaunchType, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getDatabases, type StoredDatabase } from "./lib/databases";
import { syncDatabaseSchema } from "./lib/sync-one";

type SyncState = "loading" | "no-databases" | "picking" | "syncing" | "success" | "error";

export default function Command() {
  const [state, setState] = useState<SyncState>("loading");
  const [databases, setDatabases] = useState<StoredDatabase[]>([]);
  const [selectedDb, setSelectedDb] = useState<StoredDatabase | null>(null);
  const [tableCount, setTableCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await getDatabases();
      if (cancelled) return;
      setDatabases(list);
      if (list.length === 0) {
        setState("no-databases");
        return;
      }
      if (list.length === 1) {
        setSelectedDb(list[0]!);
        setState("syncing");
        const result = await syncDatabaseSchema(list[0]!.id);
        if (cancelled) return;
        if ("error" in result) {
          setErrorMessage(result.error);
          setState("error");
          await showToast({ style: Toast.Style.Failure, title: "Sync failed", message: result.error });
        } else {
          setTableCount(result.tableCount);
          setState("success");
          await showToast({
            style: Toast.Style.Success,
            title: "Schema synced",
            message: `${result.tableCount} tables cached`,
          });
        }
        return;
      }
      setState("picking");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runSync = async (db: StoredDatabase) => {
    setSelectedDb(db);
    setState("syncing");
    const result = await syncDatabaseSchema(db.id);
    if ("error" in result) {
      setErrorMessage(result.error);
      setState("error");
      await showToast({ style: Toast.Style.Failure, title: "Sync failed", message: result.error });
    } else {
      setTableCount(result.tableCount);
      setState("success");
      await showToast({
        style: Toast.Style.Success,
        title: "Schema synced",
        message: `${result.tableCount} tables cached`,
      });
    }
  };

  const syncDescription =
    state === "syncing" && selectedDb
      ? selectedDb.type === "mongodb"
        ? "Fetching collections from MongoDB"
        : "Fetching tables and views from Postgres"
      : "Loading…";

  if (state === "loading" || state === "syncing") {
    return (
      <List isLoading={true}>
        <List.EmptyView title={state === "syncing" ? "Syncing schema…" : "Loading…"} description={syncDescription} />
      </List>
    );
  }

  if (state === "no-databases") {
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

  if (state === "error") {
    return (
      <List>
        <List.EmptyView
          title="Sync failed"
          description={errorMessage ?? "Unknown error"}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action
                title="Manage Databases"
                onAction={() => launchCommand({ name: "manage-databases", type: LaunchType.UserInitiated })}
              />
              {selectedDb && <Action title="Retry Sync" onAction={() => runSync(selectedDb)} />}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (state === "success" && selectedDb) {
    return (
      <List>
        <List.Item
          title="Schema synced"
          subtitle={`${selectedDb.name}: ${tableCount} tables cached`}
          icon={Icon.CheckCircle}
          actions={
            <ActionPanel>
              <Action
                title="Explore Tables"
                onAction={() =>
                  launchCommand({
                    name: "explore-tables",
                    type: LaunchType.UserInitiated,
                    context: { databaseId: selectedDb.id },
                  })
                }
              />
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

  return (
    <List
      searchBarPlaceholder="Pick a database to sync..."
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
              <Action title="Sync This Database" onAction={() => runSync(db)} />
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
