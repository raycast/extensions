import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteProvider,
  getProviderHost,
  getProviderState,
  importLegacyProvider,
  LEGACY_PROVIDER_ID,
  saveProvider,
  setActiveProviderId,
  type AIProvider
} from "./providers";

type ManageProvidersViewProps = {
  onProvidersChange?: () => void | Promise<void>;
};

type ProviderFormProps = {
  provider?: AIProvider;
  onSave?: () => void | Promise<void>;
};

type ProviderFormValues = {
  name: string;
  apiBaseUrl: string;
  model: string;
  apiKey: string;
  setAsCurrent: boolean;
};

export function ManageProvidersView({ onProvidersChange }: ManageProvidersViewProps) {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [activeProviderId, setActiveProvider] = useState<string>();
  const [legacyProvider, setLegacyProvider] = useState<AIProvider>();

  const refreshProviders = useCallback(async () => {
    setIsLoading(true);

    try {
      const state = await getProviderState();
      setProviders(state.providers);
      setActiveProvider(state.activeProviderId);
      setLegacyProvider(state.legacyProvider);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProviders();
  }, [refreshProviders]);

  const sortedProviders = useMemo(() => {
    return [...providers].sort((left, right) => {
      if (left.id === activeProviderId) {
        return -1;
      }

      if (right.id === activeProviderId) {
        return 1;
      }

      return left.name.localeCompare(right.name);
    });
  }, [activeProviderId, providers]);

  async function handleProvidersChanged() {
    await refreshProviders();
    await onProvidersChange?.();
  }

  function openNewProviderForm() {
    push(<ProviderForm onSave={handleProvidersChanged} />);
  }

  function openEditProviderForm(provider: AIProvider) {
    push(<ProviderForm provider={provider} onSave={handleProvidersChanged} />);
  }

  async function useProvider(provider: AIProvider) {
    await setActiveProviderId(provider.id);
    await showToast({ style: Toast.Style.Success, title: "Current Provider Updated", message: provider.name });
    await handleProvidersChanged();
  }

  async function removeProvider(provider: AIProvider) {
    const confirmed = await confirmAlert({
      title: `Delete ${provider.name}?`,
      message: "This removes the provider from Raycast.",
      primaryAction: {
        title: "Delete Provider",
        style: Alert.ActionStyle.Destructive
      }
    });

    if (!confirmed) {
      return;
    }

    await deleteProvider(provider.id);
    await showToast({ style: Toast.Style.Success, title: "Provider Deleted", message: provider.name });
    await handleProvidersChanged();
  }

  async function importLegacyFallback() {
    const provider = await importLegacyProvider();
    await showToast({ style: Toast.Style.Success, title: "Legacy Provider Imported", message: provider.name });
    await handleProvidersChanged();
  }

  return (
    <List isLoading={isLoading} navigationTitle="Manage AI Providers" searchBarPlaceholder="Search providers">
      {sortedProviders.length === 0 && !legacyProvider ? (
        <List.EmptyView
          title="No AI Providers"
          description="Add a provider to start enhancing prompts."
          actions={
            <ActionPanel>
              <Action title="Add Provider" onAction={openNewProviderForm} />
            </ActionPanel>
          }
        />
      ) : null}

      {sortedProviders.length > 0 ? (
        <List.Section title="Saved Providers">
          {sortedProviders.map((provider) => {
            const isCurrent = provider.id === activeProviderId;

            return (
              <List.Item
                key={provider.id}
                icon={isCurrent ? Icon.CheckCircle : Icon.Circle}
                title={provider.name}
                subtitle={provider.model}
                accessories={[{ text: getProviderHost(provider.apiBaseUrl) }]}
                actions={
                  <ActionPanel>
                    {!isCurrent ? <Action title="Use This Provider" onAction={() => void useProvider(provider)} /> : null}
                    <Action title="Edit Provider" onAction={() => openEditProviderForm(provider)} />
                    <Action title="Add Provider" onAction={openNewProviderForm} />
                    <Action title="Delete Provider" style={Action.Style.Destructive} onAction={() => void removeProvider(provider)} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}

      {legacyProvider && sortedProviders.length === 0 ? (
        <List.Section title="Legacy Fallback">
          <List.Item
            key={LEGACY_PROVIDER_ID}
            icon={Icon.Gear}
            title={legacyProvider.name}
            subtitle={legacyProvider.model}
            accessories={[{ text: getProviderHost(legacyProvider.apiBaseUrl) }]}
            actions={
              <ActionPanel>
                <Action title="Import Legacy Provider" onAction={() => void importLegacyFallback()} />
                <Action title="Add Provider" onAction={openNewProviderForm} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}

function ProviderForm({ provider, onSave }: ProviderFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: ProviderFormValues) {
    setIsLoading(true);

    try {
      const savedProvider = await saveProvider(
        {
          name: values.name,
          apiBaseUrl: values.apiBaseUrl,
          model: values.model,
          apiKey: values.apiKey,
          setAsActive: values.setAsCurrent
        },
        provider?.id
      );

      await showToast({
        style: Toast.Style.Success,
        title: provider ? "Provider Updated" : "Provider Added",
        message: savedProvider.name
      });

      await onSave?.();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: provider ? "Could Not Update Provider" : "Could Not Add Provider",
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={provider ? "Edit Provider" : "Add Provider"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={provider ? "Save Provider" : "Add Provider"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Provider Name" placeholder="OpenAI, OpenRouter, Groq" defaultValue={provider?.name} />
      <Form.TextField
        id="apiBaseUrl"
        title="API Base URL"
        placeholder="https://api.openai.com/v1"
        defaultValue={provider?.apiBaseUrl}
      />
      <Form.TextField id="model" title="Model" placeholder="gpt-4.1-mini" defaultValue={provider?.model} />
      <Form.PasswordField id="apiKey" title="API Key" defaultValue={provider?.apiKey} />
      <Form.Checkbox id="setAsCurrent" label="Make this the current provider" defaultValue={!provider} />
    </Form>
  );
}

export default function Command() {
  return <ManageProvidersView />;
}