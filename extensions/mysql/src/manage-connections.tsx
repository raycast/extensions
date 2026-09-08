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
import { usePromise } from "@raycast/utils";
import { serverVersion } from "./lib/client";
import {
  listConnections,
  newConnection,
  removeConnection,
  setDefaultConnection,
  upsertConnection,
  type Connection,
  type SslMode,
} from "./lib/connections";

export default function ManageConnections() {
  const { push } = useNavigation();
  const { data: connections, isLoading, revalidate } = usePromise(listConnections);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search connections…">
      <List.EmptyView
        title="No connections"
        description="Add your first MySQL connection."
        icon={Icon.Plug}
        actions={
          <ActionPanel>
            <Action
              title="Add Connection"
              icon={Icon.Plus}
              onAction={() => push(<ConnectionForm onSaved={revalidate} />)}
            />
          </ActionPanel>
        }
      />
      {(connections ?? []).map((connection) => (
        <List.Item
          key={connection.id}
          icon={connection.isDefault ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
          title={connection.name}
          subtitle={`${connection.user}@${connection.host}:${connection.port}${connection.database ? `/${connection.database}` : ""}`}
          accessories={[
            ...(connection.isDefault ? [{ tag: { value: "Default", color: Color.Green } }] : []),
            { tag: connection.ssl === "off" ? "no SSL" : `SSL: ${connection.ssl}` },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Edit Connection"
                icon={Icon.Pencil}
                onAction={() => push(<ConnectionForm connection={connection} onSaved={revalidate} />)}
              />
              {!connection.isDefault && (
                <Action
                  title="Set as Default"
                  icon={Icon.Star}
                  shortcut={Keyboard.Shortcut.Common.Pin}
                  onAction={async () => {
                    await setDefaultConnection(connection.id);
                    await showToast({ style: Toast.Style.Success, title: `"${connection.name}" is now the default` });
                    revalidate();
                  }}
                />
              )}
              <Action
                title="Add Connection"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => push(<ConnectionForm onSaved={revalidate} />)}
              />
              <Action
                title="Delete Connection"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  if (await confirmAlert({ title: `Delete "${connection.name}"?` })) {
                    await removeConnection(connection.id);
                    revalidate();
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface ConnectionFormValues {
  name: string;
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  ssl: string;
  isDefault: boolean;
}

function ConnectionForm({ connection, onSaved }: { connection?: Connection; onSaved: () => void }) {
  const { pop } = useNavigation();

  function build(values: ConnectionFormValues): Connection {
    const base = {
      name: values.name.trim(),
      host: values.host.trim(),
      port: Number.parseInt(values.port, 10) || 3306,
      user: values.user.trim(),
      password: values.password || connection?.password || undefined,
      database: values.database.trim() || undefined,
      ssl: values.ssl as SslMode,
      isDefault: values.isDefault,
    };
    return connection ? { ...connection, ...base } : newConnection(base);
  }

  function validate(values: ConnectionFormValues): string | null {
    if (!values.name.trim()) return "Name is required";
    if (!values.host.trim()) return "Host is required";
    if (!values.user.trim()) return "User is required";
    return null;
  }

  async function handleTest(values: ConnectionFormValues) {
    const error = validate(values);
    if (error) {
      await showToast({ style: Toast.Style.Failure, title: error });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Testing connection…" });
    try {
      const version = await serverVersion(build(values));
      toast.style = Toast.Style.Success;
      toast.title = "Connection successful";
      toast.message = version ? `MySQL ${version}` : undefined;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Connection failed";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  async function handleSubmit(values: ConnectionFormValues) {
    const error = validate(values);
    if (error) {
      await showToast({ style: Toast.Style.Failure, title: error });
      return;
    }
    const built = build(values);

    // Verify the connection before saving so a broken profile can't silently look OK.
    const toast = await showToast({ style: Toast.Style.Animated, title: "Testing connection…" });
    let connected = false;
    let failure = "";
    try {
      await serverVersion(built);
      connected = true;
    } catch (e) {
      failure = e instanceof Error ? e.message : String(e);
    }

    if (!connected) {
      await toast.hide();
      const saveAnyway = await confirmAlert({
        title: "Connection failed",
        message: failure,
        primaryAction: { title: "Save Anyway", style: Alert.ActionStyle.Destructive },
      });
      if (!saveAnyway) return;
    }

    await upsertConnection(built);
    if (connected) {
      toast.style = Toast.Style.Success;
      toast.title = connection ? "Connection updated" : "Connection added";
    } else {
      await showToast({ style: Toast.Style.Success, title: "Saved (unverified)" });
    }
    onSaved();
    pop();
  }

  return (
    <Form
      navigationTitle={connection ? "Edit Connection" : "Add Connection"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Connection" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          <Action.SubmitForm
            title="Test Connection"
            icon={Icon.Plug}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "t" }, Windows: { modifiers: ["ctrl"], key: "t" } }}
            onSubmit={handleTest}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Local" defaultValue={connection?.name} />
      <Form.TextField id="host" title="Host" placeholder="127.0.0.1" defaultValue={connection?.host} />
      <Form.TextField
        id="port"
        title="Port"
        placeholder="3306"
        defaultValue={connection ? String(connection.port) : "3306"}
      />
      <Form.TextField id="user" title="User" placeholder="root" defaultValue={connection?.user} />
      <Form.PasswordField
        id="password"
        title="Password"
        defaultValue={connection?.password}
        info={connection ? "Leave blank to keep the current password" : undefined}
      />
      <Form.TextField id="database" title="Database" placeholder="(optional)" defaultValue={connection?.database} />
      <Form.Dropdown id="ssl" title="SSL" defaultValue={connection?.ssl ?? "off"}>
        <Form.Dropdown.Item value="off" title="Off" />
        <Form.Dropdown.Item value="require" title="Require (verify certificate)" />
        <Form.Dropdown.Item value="insecure" title="Require (skip verification)" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Checkbox id="isDefault" label="Use as default connection" defaultValue={connection?.isDefault ?? false} />
    </Form>
  );
}
