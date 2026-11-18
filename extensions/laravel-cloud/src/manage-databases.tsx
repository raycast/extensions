import {
  ActionPanel,
  Action,
  List,
  Icon,
  Form,
  useNavigation,
  Alert,
  confirmAlert,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  listDatabaseClusters,
  listDatabaseTypes,
  createDatabaseCluster,
  deleteDatabaseCluster,
  listDatabaseSchemas,
  createDatabaseSchema,
  deleteDatabaseSchema,
  listDatabaseSnapshots,
  createDatabaseSnapshot,
} from "./api/databases";
import { DatabaseCluster, DatabaseTypeOption } from "./types/database";
import { getDatabaseStatusIcon } from "./utils/status-icons";
import { timeAgo } from "./utils/dates";
import { useState } from "react";

export default function ManageDatabases() {
  const { data, isLoading, revalidate } = useCachedPromise(() => listDatabaseClusters(), []);

  async function handleDelete(cluster: DatabaseCluster) {
    if (
      await confirmAlert({
        title: "Delete Database Cluster",
        message: `Are you sure you want to delete "${cluster.attributes.name}"? This action cannot be undone.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting database cluster..." });
        await deleteDatabaseCluster(cluster.id);
        await showToast({ style: Toast.Style.Success, title: "Database cluster deleted" });
        revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete database cluster",
          message: String(error),
        });
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search database clusters...">
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Create Database Cluster"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Database Cluster"
                icon={Icon.Plus}
                target={<CreateDatabaseClusterForm onCreated={revalidate} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Database Clusters">
        {data?.data.map((cluster) => {
          const statusIcon = getDatabaseStatusIcon(cluster.attributes.status);
          return (
            <List.Item
              key={cluster.id}
              icon={{ source: statusIcon.icon, tintColor: statusIcon.color }}
              title={cluster.attributes.name}
              subtitle={cluster.attributes.type}
              accessories={[
                { tag: { value: cluster.attributes.region, color: Color.Blue } },
                { tag: { value: cluster.attributes.status, color: statusIcon.color } },
                { text: timeAgo(cluster.attributes.created_at) },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    icon={Icon.Eye}
                    target={<DatabaseClusterDetail cluster={cluster} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy Connection String"
                    content={`${cluster.attributes.connection.driver}://${cluster.attributes.connection.username}:${cluster.attributes.connection.password}@${cluster.attributes.connection.hostname}:${cluster.attributes.connection.port}`}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Password"
                    content={cluster.attributes.connection.password}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />
                  <Action
                    title="Delete Cluster"
                    icon={Icon.Trash}
                    onAction={() => handleDelete(cluster)}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function DatabaseClusterDetail({ cluster }: { cluster: DatabaseCluster }) {
  const {
    data: schemasData,
    isLoading: schemasLoading,
    revalidate: revalidateSchemas,
  } = useCachedPromise((id: string) => listDatabaseSchemas(id), [cluster.id]);

  const {
    data: snapshotsData,
    isLoading: snapshotsLoading,
    revalidate: revalidateSnapshots,
  } = useCachedPromise((id: string) => listDatabaseSnapshots(id), [cluster.id]);

  async function handleDeleteSchema(schemaId: string, schemaName: string) {
    if (
      await confirmAlert({
        title: "Delete Database",
        message: `Are you sure you want to delete "${schemaName}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting database..." });
        await deleteDatabaseSchema(cluster.id, schemaId);
        await showToast({ style: Toast.Style.Success, title: "Database deleted" });
        revalidateSchemas();
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to delete database", message: String(error) });
      }
    }
  }

  return (
    <List
      navigationTitle={cluster.attributes.name}
      isLoading={schemasLoading || snapshotsLoading}
      searchBarPlaceholder="Search databases and snapshots..."
    >
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Create Database"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Database"
                icon={Icon.Plus}
                target={<CreateDatabaseSchemaForm clusterId={cluster.id} onCreated={revalidateSchemas} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Camera}
          title="Create Snapshot"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Snapshot"
                icon={Icon.Camera}
                target={<CreateSnapshotForm clusterId={cluster.id} onCreated={revalidateSnapshots} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Databases">
        {schemasData?.data.map((schema) => (
          <List.Item
            key={schema.id}
            icon={Icon.HardDrive}
            title={schema.attributes.name}
            accessories={[{ text: timeAgo(schema.attributes.created_at) }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Database Name" content={schema.attributes.name} />
                <Action
                  title="Delete Database"
                  icon={Icon.Trash}
                  onAction={() => handleDeleteSchema(schema.id, schema.attributes.name)}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Snapshots">
        {snapshotsData?.data.map((snapshot) => {
          const statusIcon = getDatabaseStatusIcon(snapshot.attributes.status);
          return (
            <List.Item
              key={snapshot.id}
              icon={{ source: statusIcon.icon, tintColor: statusIcon.color }}
              title={snapshot.attributes.name}
              subtitle={snapshot.attributes.description || undefined}
              accessories={[
                { tag: { value: snapshot.attributes.status, color: statusIcon.color } },
                { text: timeAgo(snapshot.attributes.created_at) },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Snapshot Name" content={snapshot.attributes.name} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function CreateDatabaseClusterForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();
  const [selectedType, setSelectedType] = useState<string>("");

  const { data: typesData, isLoading } = useCachedPromise(() => listDatabaseTypes(), []);

  const typeOptions = typesData?.data ?? [];
  const selectedTypeOption = typeOptions.find((t: DatabaseTypeOption) => t.type === selectedType);

  async function handleSubmit(values: Record<string, string | boolean>) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating database cluster..." });

      const config: Record<string, unknown> = {};
      if (selectedTypeOption) {
        for (const field of selectedTypeOption.config_schema) {
          if (values[`config_${field.name}`] !== undefined && values[`config_${field.name}`] !== "") {
            config[field.name] = values[`config_${field.name}`];
          }
        }
      }

      await createDatabaseCluster({
        name: values.name,
        type: values.type,
        region: values.region,
        config,
      });
      await showToast({ style: Toast.Style.Success, title: "Database cluster created" });
      onCreated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create database cluster",
        message: String(error),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Database Cluster"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Database Cluster" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="my-database" />
      <Form.Dropdown id="type" title="Type" onChange={setSelectedType}>
        {typeOptions.map((t: DatabaseTypeOption) => (
          <Form.Dropdown.Item key={t.type} title={t.label} value={t.type} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="region" title="Region">
        {(selectedTypeOption?.regions ?? []).map((r: string) => (
          <Form.Dropdown.Item key={r} title={r} value={r} />
        ))}
      </Form.Dropdown>
      {selectedTypeOption?.config_schema.map((field) =>
        field.enum ? (
          <Form.Dropdown key={field.name} id={`config_${field.name}`} title={field.name} info={field.description}>
            {(field.enum as string[]).map((v) => (
              <Form.Dropdown.Item key={String(v)} title={String(v)} value={String(v)} />
            ))}
          </Form.Dropdown>
        ) : (
          <Form.TextField
            key={field.name}
            id={`config_${field.name}`}
            title={field.name}
            placeholder={field.description}
          />
        ),
      )}
    </Form>
  );
}

function CreateDatabaseSchemaForm({ clusterId, onCreated }: { clusterId: string; onCreated: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string }) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating database..." });
      await createDatabaseSchema(clusterId, { name: values.name });
      await showToast({ style: Toast.Style.Success, title: "Database created" });
      onCreated();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to create database", message: String(error) });
    }
  }

  return (
    <Form
      navigationTitle="Create Database"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Database" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="my_database" />
    </Form>
  );
}

function CreateSnapshotForm({ clusterId, onCreated }: { clusterId: string; onCreated: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; description: string }) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating snapshot..." });
      await createDatabaseSnapshot(clusterId, {
        name: values.name,
        description: values.description || undefined,
      });
      await showToast({ style: Toast.Style.Success, title: "Snapshot created" });
      onCreated();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to create snapshot", message: String(error) });
    }
  }

  return (
    <Form
      navigationTitle="Create Snapshot"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Snapshot" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="my-snapshot" />
      <Form.TextField id="description" title="Description" placeholder="Optional description" />
    </Form>
  );
}
