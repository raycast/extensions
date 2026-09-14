import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { serverVersion } from "./lib/client";
import {
  DEFAULT_PORT,
  listConnections,
  newConnection,
  removeConnection,
  setDefaultConnection,
  upsertConnection,
  type Connection,
  type SslMode,
} from "./lib/connections";
import { describeError } from "./lib/format";

export default function ManageConnections() {
  const { data, isLoading, revalidate } = useCachedPromise(listConnections, []);
  const connections = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search connections…">
      <List.EmptyView
        icon={Icon.Plug}
        title="No connections yet"
        description="Add the first PostgreSQL connection profile."
        actions={
          <ActionPanel>
            <Action.Push title="Add Connection" icon={Icon.Plus} target={<ConnectionForm onSave={revalidate} />} />
          </ActionPanel>
        }
      />
      {connections.map((connection) => (
        <List.Item
          key={connection.id}
          icon={connection.isDefault ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
          title={connection.name}
          subtitle={`${connection.user}@${connection.host}:${connection.port}/${connection.database}`}
          accessories={
            [
              connection.ssl !== "off" ? { tag: connection.ssl === "require" ? "SSL" : "SSL (unverified)" } : undefined,
              connection.isDefault ? { text: "active" } : undefined,
            ].filter(Boolean) as List.Item.Accessory[]
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Connection"
                icon={Icon.Pencil}
                target={<ConnectionForm connection={connection} onSave={revalidate} />}
              />
              <Action
                title="Set as Active"
                icon={Icon.CheckCircle}
                onAction={async () => {
                  await setDefaultConnection(connection.id);
                  revalidate();
                  await showToast({ style: Toast.Style.Success, title: `${connection.name} is now active` });
                }}
              />
              <Action
                title="Test Connection"
                icon={Icon.Bolt}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "t" }, Windows: { modifiers: ["ctrl"], key: "t" } }}
                onAction={() => testConnection(connection)}
              />
              <Action.Push
                title="Add Connection"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<ConnectionForm onSave={revalidate} />}
              />
              <Action
                title="Delete Connection"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: `Delete "${connection.name}"?`,
                    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                  });
                  if (!confirmed) return;
                  await removeConnection(connection.id);
                  revalidate();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function testConnection(connection: Connection) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting…" });
  try {
    const version = await serverVersion(connection);
    toast.style = Toast.Style.Success;
    toast.title = "Connected";
    // The full version() string is a paragraph; the first three words are the useful part.
    toast.message = version.split(" ").slice(0, 3).join(" ");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not connect";
    toast.message = describeError(error);
  }
}

function ConnectionForm({ connection, onSave }: { connection?: Connection; onSave: () => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string>();
  const [hostError, setHostError] = useState<string>();

  async function submit(values: {
    name: string;
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;
    ssl: string;
    isDefault: boolean;
  }) {
    if (!values.name.trim()) return setNameError("Required");
    if (!values.host.trim()) return setHostError("Required");

    const port = Number.parseInt(values.port, 10);
    const fields = {
      name: values.name.trim(),
      host: values.host.trim(),
      port: Number.isFinite(port) && port > 0 ? port : DEFAULT_PORT,
      user: values.user.trim() || "postgres",
      password: values.password || undefined,
      database: values.database.trim() || "postgres",
      ssl: values.ssl as SslMode,
      isDefault: values.isDefault,
    };

    await upsertConnection(connection ? { ...connection, ...fields } : newConnection(fields));
    onSave();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={connection ? "Save Connection" : "Add Connection"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Production"
        defaultValue={connection?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="host"
        title="Host"
        placeholder="localhost"
        defaultValue={connection?.host ?? "localhost"}
        error={hostError}
        onChange={() => setHostError(undefined)}
      />
      <Form.TextField
        id="port"
        title="Port"
        placeholder="5432"
        defaultValue={String(connection?.port ?? DEFAULT_PORT)}
      />
      <Form.TextField
        id="database"
        title="Database"
        placeholder="postgres"
        defaultValue={connection?.database ?? "postgres"}
      />
      <Form.TextField id="user" title="User" placeholder="postgres" defaultValue={connection?.user ?? "postgres"} />
      <Form.PasswordField id="password" title="Password" defaultValue={connection?.password} />
      <Form.Dropdown id="ssl" title="SSL" defaultValue={connection?.ssl ?? "off"}>
        <Form.Dropdown.Item value="off" title="Off" />
        <Form.Dropdown.Item value="require" title="Require (validate certificate)" />
        <Form.Dropdown.Item value="insecure" title="Require (skip verification)" />
      </Form.Dropdown>
      <Form.Checkbox
        id="isDefault"
        label="Use as the active connection"
        defaultValue={connection?.isDefault ?? true}
        info="Commands and Raycast AI tools run against the active connection."
      />
    </Form>
  );
}
