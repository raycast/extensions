import { Action, ActionPanel, Detail, Form, List, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  addDatabase,
  getDatabases,
  readRegistry,
  removeDatabase,
  setDefaultDatabase,
  updateDatabase,
  type StoredDatabase,
  type DatabaseType,
} from "./lib/databases";
import {
  getExclusionRules,
  addExclusionRule,
  removeExclusionRule,
  ruleDescription,
  type ExclusionRule,
  type ExclusionRuleType,
} from "./lib/exclusion";
import { syncDatabaseSchema } from "./lib/sync-one";

type ViewMode = "list" | "detail" | "addForm" | "editCredentialsForm" | "addRuleForm";

const DB_TYPE_LABELS: Record<DatabaseType, string> = { postgres: "Postgres", mongodb: "MongoDB" };

function maskConnectionString(conn: string): string {
  if (!conn) return "(not set)";
  try {
    const url = new URL(conn);
    if (url.password) url.password = "***";
    return url.toString();
  } catch {
    return "***";
  }
}

function formatLastSynced(iso?: string): string {
  if (!iso) return "Never";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "Never";
  }
}

export default function Command() {
  const [databases, setDatabases] = useState<StoredDatabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>("list");
  const [selectedDb, setSelectedDb] = useState<StoredDatabase | null>(null);
  const [exclusionRules, setExclusionRules] = useState<ExclusionRule[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadDatabases = async () => {
    const list = await getDatabases();
    setDatabases(list);
  };

  useEffect(() => {
    loadDatabases().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedDb && mode === "detail") {
      getExclusionRules(selectedDb.id).then(setExclusionRules);
    }
  }, [selectedDb?.id, mode]);

  if (mode === "addForm") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Add Database"
              onSubmit={async (values: { name: string; dbType: DatabaseType; connectionString: string }) => {
                const name = values.name?.trim() || "Unnamed";
                const conn = values.connectionString?.trim();
                if (!conn) {
                  await showToast({ style: Toast.Style.Failure, title: "Connection string required" });
                  return;
                }
                await addDatabase({
                  name,
                  type: values.dbType ?? "postgres",
                  connectionString: conn,
                });
                await loadDatabases();
                setMode("list");
                await showToast({ style: Toast.Style.Success, title: "Database added", message: name });
              }}
            />
            <Action title="Cancel" onAction={() => setMode("list")} />
          </ActionPanel>
        }
      >
        <Form.TextField id="name" title="Name" placeholder="My Database" defaultValue="My Database" />
        <Form.Dropdown id="dbType" title="Database type">
          <Form.Dropdown.Item value="postgres" title="Postgres" />
          <Form.Dropdown.Item value="mongodb" title="MongoDB" />
        </Form.Dropdown>
        <Form.PasswordField
          id="connectionString"
          title="Connection string"
          placeholder="postgresql://user:password@host:5432/database or mongodb://localhost:27017/dbname"
        />
      </Form>
    );
  }

  if (mode === "editCredentialsForm" && selectedDb) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save"
              onSubmit={async (values: { connectionString: string }) => {
                const conn = values.connectionString?.trim();
                if (!conn) {
                  await showToast({ style: Toast.Style.Failure, title: "Connection string required" });
                  return;
                }
                await updateDatabase(selectedDb.id, { connectionString: conn });
                await loadDatabases();
                setSelectedDb((prev) => (prev ? { ...prev, connectionString: conn } : null));
                setMode("detail");
                await showToast({ style: Toast.Style.Success, title: "Credentials updated" });
              }}
            />
            <Action title="Cancel" onAction={() => setMode("detail")} />
          </ActionPanel>
        }
      >
        <Form.PasswordField
          id="connectionString"
          title="Connection string"
          placeholder={
            selectedDb.type === "mongodb"
              ? "mongodb://localhost:27017/dbname or mongodb+srv://..."
              : "postgresql://user:password@host:5432/database"
          }
          defaultValue={selectedDb.connectionString}
        />
      </Form>
    );
  }

  if (mode === "addRuleForm" && selectedDb) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Add Rule"
              onSubmit={async (values: { ruleType: ExclusionRuleType; pattern: string }) => {
                const pattern = values.pattern?.trim();
                if (!pattern) return;
                await addExclusionRule(selectedDb.id, values.ruleType, pattern);
                const rules = await getExclusionRules(selectedDb.id);
                setExclusionRules(rules);
                setMode("detail");
                await showToast({ style: Toast.Style.Success, title: "Rule added" });
              }}
            />
            <Action title="Cancel" onAction={() => setMode("detail")} />
          </ActionPanel>
        }
      >
        <Form.Dropdown id="ruleType" title="Exclusion type">
          <Form.Dropdown.Item value="regex" title="Regex match" />
          <Form.Dropdown.Item value="contains" title="Contains" />
          <Form.Dropdown.Item value="not_contains" title="Does not contain" />
        </Form.Dropdown>
        <Form.TextField
          id="pattern"
          title="Pattern"
          placeholder="e.g. hdb_catalog for contains, ^hdb_catalog\\..* for regex"
        />
      </Form>
    );
  }

  if (mode === "detail" && selectedDb) {
    const reg = readRegistry();
    const isDefault = reg.defaultId === selectedDb.id;
    const hasCredentials = !!selectedDb.connectionString?.trim();

    const markdown = [
      `# ${selectedDb.name}`,
      "",
      "## Connection",
      hasCredentials
        ? `\`${maskConnectionString(selectedDb.connectionString ?? "")}\``
        : "_No connection string set. Use **Edit Credentials** to add one._",
      "",
      "## Exclusion rules",
      exclusionRules.length === 0
        ? "_No rules. All tables from this database are shown in Explore Tables._"
        : exclusionRules
            .map(
              (r) =>
                `- \`${r.pattern}\` — ${r.type === "regex" ? "regex" : r.type === "contains" ? "contains" : "does not contain"}`,
            )
            .join("\n"),
    ].join("\n");

    return (
      <Detail
        markdown={markdown}
        navigationTitle={selectedDb.name}
        isLoading={syncing}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Type" text={DB_TYPE_LABELS[selectedDb.type]} />
            <Detail.Metadata.Label title="Last synced" text={formatLastSynced(selectedDb.lastSyncedAt)} />
            <Detail.Metadata.Label title="Show table names only" text={selectedDb.showTableNamesOnly ? "Yes" : "No"} />
            {isDefault && <Detail.Metadata.Label title="Default" text="Yes" />}
            {syncing && <Detail.Metadata.Label title="Status" text="Syncing schema…" />}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Back to List"
              onAction={() => {
                setMode("list");
                setSelectedDb(null);
              }}
            />
            <Action
              title={selectedDb.showTableNamesOnly ? "Show Full Names (Schema.Table)" : "Show Table Names Only"}
              onAction={async () => {
                const next = !selectedDb.showTableNamesOnly;
                await updateDatabase(selectedDb.id, { showTableNamesOnly: next });
                setSelectedDb((prev) => (prev ? { ...prev, showTableNamesOnly: next } : null));
                await showToast({
                  style: Toast.Style.Success,
                  title: next ? "Table names only" : "Full names",
                  message: next
                    ? "Explore Tables will show e.g. YT_CHANNELS"
                    : "Explore Tables will show e.g. public.YT_CHANNELS",
                });
              }}
            />
            <Action title="Edit Credentials" onAction={() => setMode("editCredentialsForm")} />
            <Action
              title="Sync Schema"
              onAction={async () => {
                setSyncing(true);
                const result = await syncDatabaseSchema(selectedDb.id);
                setSyncing(false);
                if ("error" in result) {
                  await showToast({ style: Toast.Style.Failure, title: "Sync failed", message: result.error });
                } else {
                  await loadDatabases();
                  setSelectedDb((prev) => (prev ? { ...prev, lastSyncedAt: new Date().toISOString() } : null));
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Schema synced",
                    message: `${result.tableCount} tables cached`,
                  });
                }
              }}
            />
            {!isDefault && (
              <Action
                title="Set as Default"
                onAction={async () => {
                  await setDefaultDatabase(selectedDb.id);
                  await loadDatabases();
                  await showToast({ style: Toast.Style.Success, title: "Default database updated" });
                }}
              />
            )}
            <Action title="Add Exclusion Rule" onAction={() => setMode("addRuleForm")} />
            {exclusionRules.map((rule) => (
              <Action
                key={rule.id}
                title={`Remove Rule: ${ruleDescription(rule)}`}
                onAction={async () => {
                  await removeExclusionRule(selectedDb.id, rule.id);
                  const rules = await getExclusionRules(selectedDb.id);
                  setExclusionRules(rules);
                  await showToast({ style: Toast.Style.Success, title: "Rule removed" });
                }}
              />
            ))}
            <Action
              title="Delete Database"
              style={Action.Style.Destructive}
              onAction={async () => {
                await removeDatabase(selectedDb.id);
                await loadDatabases();
                setMode("list");
                setSelectedDb(null);
                await showToast({ style: Toast.Style.Success, title: "Database deleted", message: selectedDb.name });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search databases..."
      actions={
        <ActionPanel>
          <Action title="Add Database" onAction={() => setMode("addForm")} />
        </ActionPanel>
      }
    >
      {databases.length === 0 && !loading ? (
        <List.EmptyView
          title="No databases"
          description="Add a database to get started."
          icon={Icon.Plug}
          actions={
            <ActionPanel>
              <Action title="Add Database" onAction={() => setMode("addForm")} />
            </ActionPanel>
          }
        />
      ) : (
        databases.map((db) => {
          const reg = readRegistry();
          const isDefault = reg.defaultId === db.id;
          return (
            <List.Item
              key={db.id}
              title={db.name}
              subtitle={[DB_TYPE_LABELS[db.type], db.lastSyncedAt ? formatLastSynced(db.lastSyncedAt) : "Never synced"]
                .filter(Boolean)
                .join(" · ")}
              accessoryTitle={isDefault ? "Default" : undefined}
              actions={
                <ActionPanel>
                  <Action
                    title="Open"
                    onAction={() => {
                      setSelectedDb(db);
                      setMode("detail");
                    }}
                  />
                  <Action title="Add Database" onAction={() => setMode("addForm")} />
                  {!isDefault && (
                    <Action
                      title="Set as Default"
                      onAction={async () => {
                        await setDefaultDatabase(db.id);
                        await loadDatabases();
                        await showToast({ style: Toast.Style.Success, title: "Default database updated" });
                      }}
                    />
                  )}
                  <Action
                    title="Delete Database"
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      await removeDatabase(db.id);
                      await loadDatabases();
                      await showToast({ style: Toast.Style.Success, title: "Database deleted", message: db.name });
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
