import { List, ActionPanel, Action, Icon, Form, useNavigation, Keyboard } from "@raycast/api";
import { useState, useMemo } from "react";
import { useKubeconfig } from "./hooks/useKubeconfig";
import { createContext, deleteContext, modifyContext, getAllClusters, getAllUsers } from "./utils/kubeconfig-direct";
import { KubernetesContext } from "./types";
import { showSuccessToast, showErrorToast } from "./utils/errors";
import { ContextDetails } from "./components/ContextDetails";

export default function ManageContexts() {
  const { contexts, isLoading, error, refresh } = useKubeconfig();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContexts = useMemo(() => {
    if (!searchQuery) return contexts;

    return contexts.filter(
      (context) =>
        context.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        context.cluster.toLowerCase().includes(searchQuery.toLowerCase()) ||
        context.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (context.namespace && context.namespace.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }, [contexts, searchQuery]);

  if (error) {
    return (
      <List>
        <List.Item title="Error Loading Contexts" subtitle={error.message} accessories={[{ text: "❌" }]} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchQuery}
      searchBarPlaceholder="Search contexts to manage..."
      actions={
        <ActionPanel>
          <Action.Push title="Create New Context" icon={Icon.Plus} target={<CreateContextForm onCreated={refresh} />} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    >
      {filteredContexts.map((context) => (
        <List.Item
          key={context.name}
          icon={context.current ? Icon.CheckCircle : Icon.Circle}
          title={context.name}
          subtitle={`Cluster: ${context.cluster} • User: ${context.user}${context.clusterDetails ? ` • ${context.clusterDetails.hostname}:${context.clusterDetails.port}` : ""}`}
          accessories={[
            {
              text: `ns: ${context.namespace || "default"}`,
              tooltip: "Namespace",
            },
            {
              text: context.userAuthMethod || "Unknown",
              tooltip: "Authentication Method",
            },
            context.clusterDetails
              ? {
                  text: context.clusterDetails.protocol,
                  tooltip: `${context.clusterDetails.isSecure ? "Secure" : "Insecure"} connection`,
                }
              : {},
            {
              text: context.current ? "current" : "",
              tooltip: context.current ? "Active context" : undefined,
            },
          ].filter((acc) => acc.text !== undefined)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Context"
                icon={Icon.Plus}
                target={<CreateContextForm onCreated={refresh} />}
              />
              <Action.Push
                title={`Modify ${context.name}`}
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<ModifyContextForm context={context} onModified={refresh} />}
              />
              {!context.current && (
                <Action
                  title={`Delete ${context.name}`}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={async () => {
                    try {
                      await deleteContext(context.name);
                      await showSuccessToast("Context Deleted", `Successfully deleted context: ${context.name}`);
                      refresh();
                    } catch (err) {
                      await showErrorToast(err as Error);
                    }
                  }}
                />
              )}
              <Action.Push
                title={`View ${context.name} Details`}
                icon={Icon.Info}
                target={<ContextDetails context={context} />}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
            </ActionPanel>
          }
        />
      ))}

      {filteredContexts.length === 0 && !isLoading && (
        <List.Item
          title="No Contexts Found"
          subtitle={searchQuery ? `No contexts match "${searchQuery}"` : "No contexts available for management"}
          accessories={[{ text: searchQuery ? "🔍" : "⚠️" }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Context"
                icon={Icon.Plus}
                target={<CreateContextForm onCreated={refresh} />}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function CreateContextForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [clusterError, setClusterError] = useState<string | undefined>();
  const [userError, setUserError] = useState<string | undefined>();
  const [useExistingCluster, setUseExistingCluster] = useState(true);
  const [useExistingUser, setUseExistingUser] = useState(true);

  const clusters = getAllClusters();
  const users = getAllUsers();

  async function handleSubmit(values: {
    name: string;
    cluster?: string;
    clusterName?: string;
    clusterServer?: string;
    user?: string;
    userName?: string;
    namespace?: string;
  }) {
    // Validation
    if (!values.name.trim()) {
      setNameError("Context name is required");
      return;
    }

    const clusterName = useExistingCluster ? values.cluster?.trim() : values.clusterName?.trim();
    if (!clusterName) {
      setClusterError("Cluster name is required");
      return;
    }

    const userName = useExistingUser ? values.user?.trim() : values.userName?.trim();
    if (!userName) {
      setUserError("User name is required");
      return;
    }

    try {
      await createContext(
        values.name.trim(),
        clusterName,
        userName,
        values.namespace?.trim() || undefined,
        useExistingCluster ? undefined : values.clusterServer?.trim(),
      );

      await showSuccessToast("Context Created", `Successfully created context: ${values.name}`);
      onCreated();
      pop();
    } catch (error) {
      await showErrorToast(error as Error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Context" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={() => pop()} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Context Name"
        placeholder="my-new-context"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />

      <Form.Checkbox
        id="useExistingCluster"
        title="Cluster Selection"
        label="Use existing cluster"
        value={useExistingCluster}
        onChange={setUseExistingCluster}
      />

      {useExistingCluster ? (
        <Form.Dropdown id="cluster" title="Cluster" error={clusterError} onChange={() => setClusterError(undefined)}>
          <Form.Dropdown.Item value="" title="Select a cluster..." />
          {clusters.map((cluster) => (
            <Form.Dropdown.Item
              key={cluster.name}
              value={cluster.name}
              title={`${cluster.name}${cluster.server ? ` (${cluster.server})` : ""}`}
            />
          ))}
        </Form.Dropdown>
      ) : (
        <>
          <Form.TextField
            id="clusterName"
            title="Cluster Name"
            placeholder="my-cluster"
            error={clusterError}
            onChange={() => setClusterError(undefined)}
          />
          <Form.TextField
            id="clusterServer"
            title="Cluster Server URL (Optional)"
            placeholder="https://my-cluster.example.com:6443"
          />
        </>
      )}

      <Form.Checkbox
        id="useExistingUser"
        title="User Selection"
        label="Use existing user"
        value={useExistingUser}
        onChange={setUseExistingUser}
      />

      {useExistingUser ? (
        <Form.Dropdown id="user" title="User" error={userError} onChange={() => setUserError(undefined)}>
          <Form.Dropdown.Item value="" title="Select a user..." />
          {users.map((user) => (
            <Form.Dropdown.Item
              key={user.name}
              value={user.name}
              title={`${user.name}${user.authMethod ? ` (${user.authMethod})` : ""}`}
            />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField
          id="userName"
          title="User Name"
          placeholder="my-user"
          error={userError}
          onChange={() => setUserError(undefined)}
        />
      )}

      <Form.TextField id="namespace" title="Namespace (Optional)" placeholder="default" />
    </Form>
  );
}

function ModifyContextForm({ context, onModified }: { context: KubernetesContext; onModified: () => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [useExistingCluster, setUseExistingCluster] = useState(true);
  const [useExistingUser, setUseExistingUser] = useState(true);

  const clusters = getAllClusters();
  const users = getAllUsers();

  async function handleSubmit(values: {
    name: string;
    cluster?: string;
    clusterName?: string;
    user?: string;
    userName?: string;
    namespace?: string;
  }) {
    // Validation
    if (!values.name.trim()) {
      setNameError("Context name is required");
      return;
    }

    try {
      const updates: {
        newName?: string;
        cluster?: string;
        user?: string;
        namespace?: string;
      } = {};

      if (values.name.trim() !== context.name) {
        updates.newName = values.name.trim();
      }

      const newCluster = useExistingCluster ? values.cluster?.trim() : values.clusterName?.trim();
      if (newCluster && newCluster !== context.cluster) {
        updates.cluster = newCluster;
      }

      const newUser = useExistingUser ? values.user?.trim() : values.userName?.trim();
      if (newUser && newUser !== context.user) {
        updates.user = newUser;
      }

      const newNamespace = values.namespace?.trim() || "";
      const currentNamespace = context.namespace || "";
      if (newNamespace !== currentNamespace) {
        updates.namespace = newNamespace;
      }

      if (Object.keys(updates).length === 0) {
        await showSuccessToast("No Changes", "No modifications were made");
        pop();
        return;
      }

      await modifyContext(context.name, updates);

      await showSuccessToast("Context Modified", `Successfully updated context: ${values.name}`);
      onModified();
      pop();
    } catch (error) {
      await showErrorToast(error as Error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Context" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={() => pop()} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Context Name"
        defaultValue={context.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />

      <Form.Checkbox
        id="useExistingCluster"
        title="Cluster Selection"
        label="Use existing cluster"
        value={useExistingCluster}
        onChange={setUseExistingCluster}
      />

      {useExistingCluster ? (
        <Form.Dropdown id="cluster" title="Cluster" defaultValue={context.cluster}>
          {clusters.map((cluster) => (
            <Form.Dropdown.Item
              key={cluster.name}
              value={cluster.name}
              title={`${cluster.name}${cluster.server ? ` (${cluster.server})` : ""}`}
            />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField id="clusterName" title="Cluster Name" defaultValue={context.cluster} placeholder="my-cluster" />
      )}

      <Form.Checkbox
        id="useExistingUser"
        title="User Selection"
        label="Use existing user"
        value={useExistingUser}
        onChange={setUseExistingUser}
      />

      {useExistingUser ? (
        <Form.Dropdown id="user" title="User" defaultValue={context.user}>
          {users.map((user) => (
            <Form.Dropdown.Item
              key={user.name}
              value={user.name}
              title={`${user.name}${user.authMethod ? ` (${user.authMethod})` : ""}`}
            />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField id="userName" title="User Name" defaultValue={context.user} placeholder="my-user" />
      )}

      <Form.TextField id="namespace" title="Namespace" defaultValue={context.namespace || ""} placeholder="default" />
    </Form>
  );
}
