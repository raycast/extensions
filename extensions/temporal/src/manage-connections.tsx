import { useState, useCallback } from "react";
import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Form,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClustersFromStorage, addCluster, updateCluster, deleteCluster } from "./lib/storage";
import { ClusterConfig, ConnectionType } from "./lib/types";
import { invalidateClustersCache, testConnectionForCluster } from "./lib/temporal-client";

// ============================================================================
// Main List View
// ============================================================================

export default function ManageConnections() {
  const {
    data: clusters,
    isLoading,
    revalidate,
  } = useCachedPromise(getClustersFromStorage, [], {
    keepPreviousData: true,
  });

  const handleRefresh = useCallback(() => {
    invalidateClustersCache();
    revalidate();
  }, [revalidate]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search connections...">
      {clusters?.length === 0 ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Connections"
          description="Add your first Temporal connection to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Connection"
                icon={Icon.Plus}
                target={<AddConnectionForm onSuccess={handleRefresh} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Connections" subtitle={String(clusters?.length || 0)}>
          {clusters?.map((cluster) => (
            <ConnectionListItem key={cluster.name} cluster={cluster} onRefresh={handleRefresh} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// ============================================================================
// Connection List Item
// ============================================================================

interface ConnectionListItemProps {
  cluster: ClusterConfig;
  onRefresh: () => void;
}

function ConnectionListItem({ cluster, onRefresh }: ConnectionListItemProps) {
  const hasApiKey = Boolean(cluster.apiKey);
  const isCloud = cluster.connectionType === "cloud";

  return (
    <List.Item
      title={cluster.name}
      subtitle={cluster.address}
      icon={{
        source: isCloud ? Icon.Cloud : Icon.Globe,
        tintColor: isCloud ? Color.Purple : Color.Blue,
      }}
      accessories={[
        { text: cluster.namespace, tooltip: `Default namespace: ${cluster.namespace}` },
        isCloud ? { tag: { value: "Cloud", color: Color.Purple } } : { tag: { value: "Local", color: Color.Blue } },
        hasApiKey ? { icon: Icon.Key, tooltip: "API key configured" } : {},
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Connection">
            <Action.Push
              title="Edit Connection"
              icon={Icon.Pencil}
              target={<EditConnectionForm cluster={cluster} onSuccess={onRefresh} />}
            />
            <Action.Push title="Test Connection" icon={Icon.Bolt} target={<TestConnection cluster={cluster} />} />
            <Action
              title="Delete Connection"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Delete Connection",
                  message: `Are you sure you want to delete "${cluster.name}"?`,
                  primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                });
                if (!confirmed) return;

                const error = await deleteCluster(cluster.name);
                if (error) {
                  await showToast({ style: Toast.Style.Failure, title: "Error", message: error });
                } else {
                  invalidateClustersCache();
                  await showToast({ style: Toast.Style.Success, title: "Connection Deleted" });
                  onRefresh();
                }
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.Push
              title="Add Connection"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<AddConnectionForm onSuccess={onRefresh} />}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Address"
              content={cluster.address}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Namespace"
              content={cluster.namespace}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// ============================================================================
// Add Connection Form
// ============================================================================

interface AddConnectionFormProps {
  onSuccess: () => void;
}

function AddConnectionForm({ onSuccess }: AddConnectionFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [addressError, setAddressError] = useState<string | undefined>();
  const [connectionType, setConnectionType] = useState<ConnectionType>("local");

  const handleSubmit = async (values: {
    name: string;
    connectionType: ConnectionType;
    address: string;
    namespace: string;
    apiKey: string;
    webUiUrl: string;
  }) => {
    // Validation
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }
    if (!values.address.trim()) {
      setAddressError("Address is required");
      return;
    }

    // Validate address format (should be host:port)
    const address = values.address.trim();
    if (!address.includes(":") || address.startsWith("http")) {
      setAddressError("Address should be in format host:port (e.g., localhost:7233)");
      return;
    }

    // Cloud connections require API key
    if (values.connectionType === "cloud" && !values.apiKey.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Required",
        message: "Temporal Cloud requires an API key",
      });
      return;
    }

    setIsLoading(true);

    const cluster: ClusterConfig = {
      name: values.name.trim(),
      address: address,
      namespace: values.namespace.trim() || "default",
      apiKey: values.apiKey.trim() || undefined,
      connectionType: values.connectionType,
      webUiUrl: values.webUiUrl.trim() || undefined,
    };

    const error = await addCluster(cluster);

    if (error) {
      setIsLoading(false);
      await showToast({ style: Toast.Style.Failure, title: "Error", message: error });
      return;
    }

    invalidateClustersCache();
    await showToast({
      style: Toast.Style.Success,
      title: "Connection Added",
      message: cluster.name,
    });
    onSuccess();
    pop();
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add Connection"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Connection" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g., Local Dev, Staging, Production"
        error={nameError}
        onChange={() => setNameError(undefined)}
        autoFocus
      />

      <Form.Dropdown
        id="connectionType"
        title="Connection Type"
        value={connectionType}
        onChange={(value) => setConnectionType(value as ConnectionType)}
      >
        <Form.Dropdown.Item value="local" title="Local / Self-Hosted" icon={Icon.Globe} />
        <Form.Dropdown.Item value="cloud" title="Temporal Cloud" icon={Icon.Cloud} />
      </Form.Dropdown>

      <Form.TextField
        id="address"
        title="gRPC Address"
        placeholder={connectionType === "cloud" ? "namespace.account.tmprl.cloud:7233" : "localhost:7233"}
        defaultValue={connectionType === "local" ? "localhost:7233" : ""}
        info="Temporal gRPC endpoint (host:port)"
        error={addressError}
        onChange={() => setAddressError(undefined)}
      />

      <Form.TextField
        id="namespace"
        title="Namespace"
        placeholder={connectionType === "cloud" ? "your-namespace.your-account" : "default"}
        defaultValue={connectionType === "local" ? "default" : ""}
        info="Default namespace for this connection"
      />

      {connectionType === "cloud" && (
        <Form.PasswordField
          id="apiKey"
          title="API Key"
          placeholder="Required for Temporal Cloud"
          info="Your Temporal Cloud API key"
        />
      )}

      {connectionType === "local" && (
        <Form.PasswordField
          id="apiKey"
          title="API Key"
          placeholder="Optional"
          info="API key if your self-hosted cluster requires authentication"
        />
      )}

      <Form.TextField
        id="webUiUrl"
        title="Web UI URL"
        placeholder={connectionType === "cloud" ? "https://cloud.temporal.io" : "http://localhost:8233"}
        info="Optional: URL to open workflows in Temporal Web UI (Cmd+O)"
      />

      <Form.Description
        title="Examples"
        text={
          connectionType === "cloud"
            ? `
Address: your-namespace.your-account.tmprl.cloud:7233
Namespace: your-namespace.your-account
        `.trim()
            : `
Local Docker: localhost:7233
Dev Server: localhost:7233
Self-hosted: temporal.mycompany.com:7233
        `.trim()
        }
      />
    </Form>
  );
}

// ============================================================================
// Edit Connection Form
// ============================================================================

interface EditConnectionFormProps {
  cluster: ClusterConfig;
  onSuccess: () => void;
}

function EditConnectionForm({ cluster, onSuccess }: EditConnectionFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [addressError, setAddressError] = useState<string | undefined>();
  const [connectionType, setConnectionType] = useState<ConnectionType>(cluster.connectionType || "local");

  const handleSubmit = async (values: {
    name: string;
    connectionType: ConnectionType;
    address: string;
    namespace: string;
    apiKey: string;
    webUiUrl: string;
  }) => {
    // Validation
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }
    if (!values.address.trim()) {
      setAddressError("Address is required");
      return;
    }

    // Validate address format (should be host:port)
    const address = values.address.trim();
    if (!address.includes(":") || address.startsWith("http")) {
      setAddressError("Address should be in format host:port (e.g., localhost:7233)");
      return;
    }

    // Cloud connections require API key
    if (values.connectionType === "cloud" && !values.apiKey.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Required",
        message: "Temporal Cloud requires an API key",
      });
      return;
    }

    setIsLoading(true);

    const updatedCluster: ClusterConfig = {
      name: values.name.trim(),
      address: address,
      namespace: values.namespace.trim() || "default",
      apiKey: values.apiKey.trim() || undefined,
      connectionType: values.connectionType,
      webUiUrl: values.webUiUrl.trim() || undefined,
    };

    const error = await updateCluster(cluster.name, updatedCluster);

    if (error) {
      setIsLoading(false);
      await showToast({ style: Toast.Style.Failure, title: "Error", message: error });
      return;
    }

    invalidateClustersCache();
    await showToast({
      style: Toast.Style.Success,
      title: "Connection Updated",
      message: updatedCluster.name,
    });
    onSuccess();
    pop();
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit: ${cluster.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={cluster.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
        autoFocus
      />

      <Form.Dropdown
        id="connectionType"
        title="Connection Type"
        value={connectionType}
        onChange={(value) => setConnectionType(value as ConnectionType)}
      >
        <Form.Dropdown.Item value="local" title="Local / Self-Hosted" icon={Icon.Globe} />
        <Form.Dropdown.Item value="cloud" title="Temporal Cloud" icon={Icon.Cloud} />
      </Form.Dropdown>

      <Form.TextField
        id="address"
        title="gRPC Address"
        defaultValue={cluster.address}
        info="Temporal gRPC endpoint (host:port)"
        error={addressError}
        onChange={() => setAddressError(undefined)}
      />

      <Form.TextField
        id="namespace"
        title="Namespace"
        defaultValue={cluster.namespace}
        info="Default namespace for this connection"
      />

      <Form.PasswordField
        id="apiKey"
        title="API Key"
        defaultValue={cluster.apiKey || ""}
        placeholder={connectionType === "cloud" ? "Required for Temporal Cloud" : "Optional"}
        info={
          connectionType === "cloud" ? "Your Temporal Cloud API key" : "API key if your cluster requires authentication"
        }
      />

      <Form.TextField
        id="webUiUrl"
        title="Web UI URL"
        defaultValue={cluster.webUiUrl || ""}
        placeholder={connectionType === "cloud" ? "https://cloud.temporal.io" : "http://localhost:8233"}
        info="Optional: URL to open workflows in Temporal Web UI (Cmd+O)"
      />
    </Form>
  );
}

// ============================================================================
// Test Connection View
// ============================================================================

interface TestConnectionProps {
  cluster: ClusterConfig;
}

function TestConnection({ cluster }: TestConnectionProps) {
  const { pop } = useNavigation();

  const { data, isLoading, error } = useCachedPromise(
    async (c: ClusterConfig) => {
      // Use testConnectionForCluster which works with namespace-scoped API keys
      const result = await testConnectionForCluster(c);
      if (!result.success) {
        throw new Error(result.error || "Connection failed");
      }
      return result;
    },
    [cluster],
    {
      keepPreviousData: false,
    }
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Test: ${cluster.name}`}>
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Connection Failed"
          description={error instanceof Error ? error.message : String(error)}
          actions={
            <ActionPanel>
              <Action title="Go Back" icon={Icon.ArrowLeft} onAction={pop} />
            </ActionPanel>
          }
        />
      ) : data ? (
        <>
          <List.Section title="Connection Successful">
            <List.Item
              title="Status"
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              accessories={[{ text: "Connected", icon: Icon.CheckCircle }]}
            />
            <List.Item
              title="Type"
              icon={cluster.connectionType === "cloud" ? Icon.Cloud : Icon.Globe}
              accessories={[
                {
                  text: cluster.connectionType === "cloud" ? "Temporal Cloud" : "Local / Self-Hosted",
                },
              ]}
            />
            <List.Item title="Address" icon={Icon.Link} accessories={[{ text: cluster.address }]} />
          </List.Section>
          {data.namespace && (
            <List.Section title="Namespace">
              <List.Item
                title={data.namespace.name}
                subtitle={data.namespace.description}
                icon={Icon.Folder}
                accessories={[{ tag: data.namespace.state }]}
              />
            </List.Section>
          )}
        </>
      ) : null}
    </List>
  );
}
