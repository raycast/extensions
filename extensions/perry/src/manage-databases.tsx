import React, { useState } from "react";
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
import { testConnection } from "./lib/database";
import { addDatabase, deleteDatabase, getDatabases, updateDatabase } from "./lib/storage";
import { Database } from "./lib/types";
import { isValidConnectionString } from "./lib/utils";

export default function ManageDatabases() {
  const { data: databases = [], isLoading, revalidate } = useCachedPromise(getDatabases);

  async function handleDelete(database: Database) {
    if (
      await confirmAlert({
        title: "Delete Database",
        message: `Are you sure you want to delete "${database.name}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await deleteDatabase(database.id);
      await showToast({ style: Toast.Style.Success, title: "Database deleted" });
      revalidate();
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter databases..." filtering>
      <List.Item
        title="Add New Database"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push title="Add Database" target={<DatabaseForm onSave={revalidate} />} />
          </ActionPanel>
        }
      />
      {databases.map((database) => (
        <List.Item
          key={database.id}
          title={database.name}
          subtitle={hidePassword(database.connectionString)}
          accessories={[{ tag: database.isReadonly ? "Read-only" : "Read-write" }]}
          icon={Icon.Circle}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Database"
                icon={Icon.Pencil}
                target={<DatabaseForm database={database} onSave={revalidate} />}
              />
              <Action
                title="Delete Database"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(database)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function DatabaseForm({ database, onSave }: { database?: Database; onSave: () => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string>();
  const [connectionStringError, setConnectionStringError] = useState<string>();

  async function handleSubmit(values: { name: string; connectionString: string; isReadonly: boolean }) {
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }
    if (!values.connectionString.trim()) {
      setConnectionStringError("Connection string is required");
      return;
    }
    if (!isValidConnectionString(values.connectionString)) {
      setConnectionStringError("Invalid PostgreSQL connection string");
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Testing connection..." });
    const test = await testConnection(values.connectionString);

    if (!test.success) {
      toast.style = Toast.Style.Failure;
      toast.title = "Connection failed";
      toast.message = test.error;
      return;
    }

    if (database) {
      await updateDatabase(database.id, {
        name: values.name.trim(),
        connectionString: values.connectionString.trim(),
        isReadonly: values.isReadonly,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Database updated";
    } else {
      await addDatabase({
        id: uuidv4(),
        name: values.name.trim(),
        connectionString: values.connectionString.trim(),
        isReadonly: values.isReadonly,
        createdAt: new Date().toISOString(),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Database added";
    }

    onSave();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={database ? "Update Database" : "Add Database"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Production DB"
        defaultValue={database?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="connectionString"
        title="Connection String"
        placeholder="postgresql://user:password@localhost:5432/database"
        defaultValue={database?.connectionString}
        error={connectionStringError}
        onChange={() => setConnectionStringError(undefined)}
      />
      <Form.Checkbox
        id="isReadonly"
        label="Read-only Mode"
        defaultValue={database?.isReadonly || false}
        info="Execute queries in read-only transactions"
      />
    </Form>
  );
}

function hidePassword(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (url.password) url.password = "****";
    return url.toString();
  } catch {
    return connectionString;
  }
}
