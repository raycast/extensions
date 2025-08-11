import {
  List,
  ActionPanel,
  Action,
  useNavigation,
  Icon,
  popToRoot,
} from "@raycast/api";
import { useKubeconfig } from "./hooks/useKubeconfig";
import { showSuccessToast, showErrorToast } from "./utils/errors";
import { NamespaceSelector } from "./components/NamespaceSelector";
import { ContextDetails } from "./components/ContextDetails";

export default function SwitchContextWithNamespace() {
  const {
    contexts,
    currentContext,
    namespaces,
    isLoading,
    error,
    switchContextWithNamespace,
  } = useKubeconfig();
  const { push } = useNavigation();
  const handleContextSelect = (contextName: string) => {
    const context = contexts.find((ctx) => ctx.name === contextName);

    push(
      <NamespaceSelector
        namespaces={namespaces}
        currentNamespace={context?.namespace}
        onSelect={(namespace) => handleNamespaceSelect(contextName, namespace)}
        onCancel={() => {}}
      />,
    );
  };

  const handleNamespaceSelect = async (
    contextName: string,
    namespace: string,
  ) => {
    try {
      const success = await switchContextWithNamespace(contextName, namespace);
      if (success) {
        await showSuccessToast(
          "Context Switched",
          `Switched to: ${contextName} (namespace: ${namespace})`,
        );
        // Go back to Raycast main command list
        await popToRoot();
      }
    } catch (err) {
      await showErrorToast(err as Error);
    }
  };

  const handleQuickSwitch = async (contextName: string) => {
    try {
      const success = await switchContextWithNamespace(contextName);
      if (success) {
        await showSuccessToast(
          "Context Switched",
          `Switched to: ${contextName}`,
        );
        // Go back to Raycast main command list
        await popToRoot();
      }
    } catch (err) {
      await showErrorToast(err as Error);
    }
  };

  if (error) {
    return (
      <List>
        <List.Item
          title="Error Loading Contexts"
          subtitle={error.message}
          accessories={[{ text: "❌" }]}
        />
      </List>
    );
  }

  // Filter out current context since we're on a switch-specific screen
  const availableContexts = contexts.filter((ctx) => !ctx.current);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search contexts to switch to..."
    >
      <List.Item
        title={`Current: ${currentContext || "None"}`}
        subtitle="Currently active context"
        accessories={[{ text: "●" }]}
      />

      {availableContexts.map((context) => (
        <List.Item
          key={context.name}
          title={context.name}
          subtitle={`Cluster: ${context.cluster} • User: ${context.user} • Namespace: ${context.namespace || "default"}`}
          actions={
            <ActionPanel>
              <Action
                title={`Switch with Namespace Selection`}
                onAction={() => handleContextSelect(context.name)}
              />
              <Action
                title={`Quick Switch to ${context.name}`}
                onAction={() => handleQuickSwitch(context.name)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
              <Action.Push
                title={`View ${context.name} Details`}
                icon={Icon.Info}
                target={<ContextDetails context={context} />}
              />
            </ActionPanel>
          }
        />
      ))}

      {availableContexts.length === 0 && contexts.length > 0 && !isLoading && (
        <List.Item
          title="No Other Contexts Available"
          subtitle="All available contexts are already current"
          accessories={[{ text: "ℹ️" }]}
        />
      )}

      {contexts.length === 0 && !isLoading && (
        <List.Item
          title="No Contexts Found"
          subtitle="Check your ~/.kube/config file"
          accessories={[{ text: "⚠️" }]}
        />
      )}
    </List>
  );
}
