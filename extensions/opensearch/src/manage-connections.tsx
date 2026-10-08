import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { osRequest } from "./lib/client";
import {
  listConnections,
  newConnection,
  removeConnection,
  setDefaultConnection,
  upsertConnection,
  type AuthType,
  type Connection,
} from "./lib/connections";

export default function ManageConnections() {
  const { push } = useNavigation();
  const { data: connections, isLoading, revalidate } = usePromise(listConnections);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search connections…">
      <List.EmptyView
        title="No connections"
        description="Add your first OpenSearch cluster."
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
          subtitle={connection.url}
          accessories={[
            ...(connection.isDefault ? [{ tag: { value: "Default", color: Color.Green } }] : []),
            { tag: connection.auth === "sigv4" ? "SigV4" : "Basic" },
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

interface ConnectionFormProps {
  connection?: Connection;
  onSaved: () => void;
}

interface ConnectionFormValues {
  name: string;
  url: string;
  auth: string;
  username: string;
  password: string;
  awsRegion: string;
  awsService: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsSessionToken: string;
  ignoreCerts: boolean;
  isDefault: boolean;
}

function ConnectionForm({ connection, onSaved }: ConnectionFormProps) {
  const { pop } = useNavigation();
  const [auth, setAuth] = useState<AuthType>(connection?.auth ?? "basic");

  /** Returns an error message when required fields are missing, otherwise null. */
  function validate(values: ConnectionFormValues, requireName: boolean): string | null {
    if (requireName && !values.name.trim()) return "Name is required";
    if (!values.url.trim()) return "URL is required";
    if (values.auth === "sigv4") {
      if (!values.awsRegion.trim()) return "AWS Region is required for SigV4";
      if (!values.awsAccessKeyId.trim() || !values.awsSecretAccessKey) return "AWS access key and secret are required";
    }
    return null;
  }

  function buildConnection(values: ConnectionFormValues): Connection {
    const base = {
      name: values.name.trim(),
      url: values.url.trim(),
      ignoreCerts: values.ignoreCerts,
      isDefault: values.isDefault,
      auth: values.auth as AuthType,
      username: values.auth === "basic" ? values.username.trim() || undefined : undefined,
      password: values.auth === "basic" ? values.password || undefined : undefined,
      awsRegion: values.auth === "sigv4" ? values.awsRegion.trim() || undefined : undefined,
      awsService: values.auth === "sigv4" ? (values.awsService as Connection["awsService"]) : undefined,
      awsAccessKeyId: values.auth === "sigv4" ? values.awsAccessKeyId.trim() || undefined : undefined,
      awsSecretAccessKey: values.auth === "sigv4" ? values.awsSecretAccessKey || undefined : undefined,
      awsSessionToken: values.auth === "sigv4" ? values.awsSessionToken || undefined : undefined,
    };
    return connection ? { ...connection, ...base } : newConnection(base);
  }

  async function handleTest(values: ConnectionFormValues) {
    const error = validate(values, false);
    if (error) {
      await showToast({ style: Toast.Style.Failure, title: error });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Testing connection…" });
    try {
      const response = await osRequest(buildConnection(values), "GET", "/");
      if (response.ok) {
        const info = response.data as { cluster_name?: string; version?: { number?: string } } | null;
        const details = [info?.cluster_name, info?.version?.number ? `v${info.version.number}` : undefined]
          .filter(Boolean)
          .join(" · ");
        toast.style = Toast.Style.Success;
        toast.title = "Connection successful";
        toast.message = details || undefined;
      } else {
        const body = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
        toast.style = Toast.Style.Failure;
        toast.title = `Connection failed (HTTP ${response.status})`;
        toast.message = body.slice(0, 300);
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Connection failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function handleSubmit(values: ConnectionFormValues) {
    const error = validate(values, true);
    if (error) {
      await showToast({ style: Toast.Style.Failure, title: error });
      return;
    }
    await upsertConnection(buildConnection(values));
    await showToast({ style: Toast.Style.Success, title: connection ? "Connection updated" : "Connection added" });
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
      <Form.TextField id="name" title="Name" placeholder="Production" defaultValue={connection?.name} />
      <Form.TextField id="url" title="URL" placeholder="https://search.example.com" defaultValue={connection?.url} />
      <Form.Dropdown id="auth" title="Authentication" value={auth} onChange={(value) => setAuth(value as AuthType)}>
        <Form.Dropdown.Item value="basic" title="Basic Auth" />
        <Form.Dropdown.Item value="sigv4" title="AWS SigV4" />
      </Form.Dropdown>

      {auth === "basic" && (
        <>
          <Form.TextField id="username" title="Username" defaultValue={connection?.username} />
          <Form.PasswordField id="password" title="Password" defaultValue={connection?.password} />
        </>
      )}

      {auth === "sigv4" && (
        <>
          <Form.TextField
            id="awsRegion"
            title="AWS Region"
            placeholder="us-east-1"
            defaultValue={connection?.awsRegion}
          />
          <Form.Dropdown id="awsService" title="AWS Service" defaultValue={connection?.awsService ?? "es"}>
            <Form.Dropdown.Item value="es" title="Managed OpenSearch (es)" />
            <Form.Dropdown.Item value="aoss" title="Serverless (aoss)" />
          </Form.Dropdown>
          <Form.TextField id="awsAccessKeyId" title="Access Key ID" defaultValue={connection?.awsAccessKeyId} />
          <Form.PasswordField
            id="awsSecretAccessKey"
            title="Secret Access Key"
            defaultValue={connection?.awsSecretAccessKey}
          />
          <Form.PasswordField id="awsSessionToken" title="Session Token" defaultValue={connection?.awsSessionToken} />
        </>
      )}

      <Form.Separator />
      <Form.Checkbox
        id="ignoreCerts"
        label="Ignore certificate errors (not recommended)"
        defaultValue={connection?.ignoreCerts ?? false}
      />
      <Form.Checkbox id="isDefault" label="Use as default connection" defaultValue={connection?.isDefault ?? false} />
    </Form>
  );
}
