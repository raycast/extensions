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
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { InvalidSettingsError } from "./core/errors";
import {
  createProvider,
  loadProviderSettings,
  removeProvider,
  resetProviderSettings,
  saveProvider,
  setPrimaryProvider,
  setProviderEnabled,
  setProviderFallback,
  testProviderConnection,
  type ManagedProvider,
} from "./core/provider-settings";
import { PROVIDERS, PROVIDER_IDS, type ProviderId } from "./core/providers";
import { showTranslationError } from "./raycast/feedback";
import { localStore } from "./raycast/storage";

interface ManageProvidersProps {
  readonly onChange?: (() => void) | undefined;
}

export default function ManageProvidersCommand() {
  return <ManageProviders />;
}

export function ManageProviders({ onChange }: ManageProvidersProps) {
  const { data, error, isLoading, revalidate } = usePromise(() => loadProviderSettings(localStore), []);
  const [busy, setBusy] = useState(false);
  const available = PROVIDER_IDS.filter((id) => !data?.providers.some((provider) => provider.id === id));
  const changed = async () => {
    await revalidate();
    onChange?.();
  };
  const run = async (work: () => Promise<unknown>, title: string, provider: ManagedProvider | undefined) => {
    setBusy(true);
    try {
      await work();
      await changed();
      await showToast({ style: Toast.Style.Success, title });
    } catch (failure) {
      await reportProviderError(failure, provider);
    } finally {
      setBusy(false);
    }
  };
  const addAction =
    available.length > 0 ? (
      <Action.Push
        title="Add Provider"
        icon={Icon.Plus}
        target={<ProviderForm available={available} onSave={changed} />}
      />
    ) : null;

  return (
    <List isLoading={isLoading || busy} searchBarPlaceholder="Search your providers">
      {error ? (
        <List.EmptyView
          title="Could Not Load Providers"
          description="Saved settings could not be read. Retry, or reset them and re-enter your provider details."
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} />
              <Action
                title="Reset Provider Settings"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() =>
                  void (async () => {
                    if (
                      await confirmAlert({
                        title: "Reset Provider Settings?",
                        message:
                          "Removes all managed connections, credentials and model choices. You will need to add your providers again.",
                        primaryAction: {
                          title: "Reset Providers",
                          style: Alert.ActionStyle.Destructive,
                        },
                      })
                    ) {
                      await run(() => resetProviderSettings(localStore), "Provider Settings Reset", undefined);
                    }
                  })()
                }
              />
            </ActionPanel>
          }
        />
      ) : data?.providers.length === 0 ? (
        <List.EmptyView
          title="Add Your First Provider"
          description="Choose a provider and enter its details. Existing beta users must add their providers again here."
          icon={Icon.Key}
          actions={<ActionPanel>{addAction}</ActionPanel>}
        />
      ) : (
        data?.providers.map((provider) => (
          <List.Item
            key={provider.id}
            title={PROVIDERS[provider.id].name}
            subtitle={provider.model}
            icon={provider.enabled ? Icon.CheckCircle : Icon.Circle}
            accessories={[
              ...(data.primary === provider.id ? [{ tag: "Primary" }] : []),
              ...(!provider.enabled ? [{ tag: "Disabled" }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Provider"
                  icon={Icon.Pencil}
                  target={<ProviderForm provider={provider} available={[provider.id]} onSave={changed} />}
                />
                <Action
                  title="Test Connection"
                  icon={Icon.Network}
                  onAction={() =>
                    void run(() => testProviderConnection(fetch, provider), "Connection Successful", provider)
                  }
                />
                {provider.enabled && data.primary !== provider.id ? (
                  <Action
                    title="Set as Primary"
                    icon={Icon.Star}
                    onAction={() =>
                      void run(() => setPrimaryProvider(localStore, provider.id), "Primary Provider Updated", provider)
                    }
                  />
                ) : null}
                <Action
                  title={provider.enabled ? "Disable Provider" : "Enable Provider"}
                  icon={provider.enabled ? Icon.Pause : Icon.Play}
                  onAction={() =>
                    void run(
                      () => setProviderEnabled(localStore, provider.id, !provider.enabled),
                      provider.enabled ? "Provider Disabled" : "Provider Enabled",
                      provider,
                    )
                  }
                />
                <Action
                  title={data.allowFallback ? "Turn off Automatic Fallback" : "Turn on Automatic Fallback"}
                  icon={Icon.Switch}
                  onAction={() =>
                    void (async () => {
                      if (
                        !data.allowFallback &&
                        !(await confirmAlert({
                          title: "Enable Automatic Fallback?",
                          message:
                            "If the primary provider is unavailable, your text may be sent to your other enabled providers. Invalid keys still surface as errors.",
                          primaryAction: { title: "Enable Fallback" },
                        }))
                      ) {
                        return;
                      }
                      await run(
                        () => setProviderFallback(localStore, !data.allowFallback),
                        data.allowFallback ? "Fallback Disabled" : "Fallback Enabled",
                        undefined,
                      );
                    })()
                  }
                />
                <ActionPanel.Section>{addAction}</ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Remove Provider"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() =>
                      void (async () => {
                        if (
                          await confirmAlert({
                            title: `Remove ${PROVIDERS[provider.id].name}?`,
                            message:
                              "Removes this saved connection, its API key and its model choice. If this is primary, choose another primary provider afterward.",
                            primaryAction: {
                              title: "Remove Provider",
                              style: Alert.ActionStyle.Destructive,
                            },
                          })
                        ) {
                          await run(() => removeProvider(localStore, provider.id), "Provider Removed", provider);
                        }
                      })()
                    }
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
      {data && data.providers.length > 0 ? (
        <List.Section title={data.allowFallback ? "Automatic fallback is on" : "Automatic fallback is off"}>
          <List.Item
            title="Provider Settings"
            subtitle="Disabling the primary stops translation until you choose another primary."
            icon={Icon.Gear}
            actions={
              <ActionPanel>
                {addAction}
                <Action title="Refresh Providers" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}

interface ProviderFormProps {
  readonly provider?: ManagedProvider | undefined;
  readonly available: readonly ProviderId[];
  readonly onSave: () => Promise<void>;
}

function ProviderForm({ provider, available, onSave }: ProviderFormProps) {
  const { pop } = useNavigation();
  const [id, setId] = useState<ProviderId>(provider?.id ?? available[0] ?? "groq");
  const [apiKey, setApiKey] = useState(provider?.apiKey ?? "");
  const [model, setModel] = useState(provider?.model ?? "");
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl ?? "");
  const [enabled, setEnabled] = useState(provider?.enabled ?? true);
  const [busy, setBusy] = useState(false);
  const endpoint = id === "custom" || id === "ollama";
  const keyless = endpoint;

  const submit = async () => {
    setBusy(true);
    let configured: ManagedProvider | undefined;
    try {
      configured = createProvider({ id, apiKey, model, baseUrl, enabled });
      await saveProvider(localStore, configured);
      await onSave();
      await showToast({
        style: Toast.Style.Success,
        title: configured.enabled ? "Provider Saved" : "Provider Saved as Disabled",
      });
      pop();
    } catch (error) {
      await reportProviderError(error, configured);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Form
      isLoading={busy}
      navigationTitle={provider ? "Edit Provider" : "Add Provider"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Provider" icon={Icon.Checkmark} onSubmit={() => void submit()} />
          {PROVIDERS[id].keyUrl ? (
            <Action.OpenInBrowser title="Get API Key" icon={Icon.Key} url={PROVIDERS[id].keyUrl} />
          ) : null}
        </ActionPanel>
      }
    >
      {provider ? (
        <Form.Description title="Provider" text={PROVIDERS[id].name} />
      ) : (
        <Form.Dropdown
          id="provider"
          title="Provider"
          value={id}
          onChange={(value) => {
            const selected = available.find((entry) => entry === value);
            if (selected) {
              setId(selected);
              setApiKey("");
              setModel("");
              setBaseUrl("");
            }
          }}
        >
          {available.map((entry) => (
            <Form.Dropdown.Item key={entry} value={entry} title={PROVIDERS[entry].name} />
          ))}
        </Form.Dropdown>
      )}
      {id !== "ollama" ? (
        <Form.PasswordField
          id="apiKey"
          title={keyless ? "API Key (Optional)" : "API Key"}
          value={apiKey}
          onChange={setApiKey}
          info={
            keyless
              ? "Leave empty for an endpoint without authentication."
              : "An empty key automatically disables this provider."
          }
        />
      ) : null}
      {endpoint ? (
        <Form.TextField
          id="baseUrl"
          title="Base URL"
          value={baseUrl}
          onChange={setBaseUrl}
          placeholder={PROVIDERS[id].defaultBaseUrl || "http://localhost:1234/v1"}
        />
      ) : null}
      <Form.TextField
        id="model"
        title="Model"
        value={model}
        onChange={setModel}
        placeholder={PROVIDERS[id].defaultModel || "Exact model ID"}
        info={
          id === "custom"
            ? "Required. Enter the exact model ID from your server."
            : "Leave empty to use the default. Choose Model can change it later."
        }
      />
      <Form.Checkbox id="enabled" label="Enable this provider" value={enabled} onChange={setEnabled} />
      <Form.Description text="Credentials are stored in Raycast's encrypted local storage. Test Connection sends only a short synthetic prompt and may incur a provider charge." />
    </Form>
  );
}

async function reportProviderError(error: unknown, provider: ManagedProvider | undefined): Promise<void> {
  await showTranslationError(
    error instanceof Error ? error : new InvalidSettingsError("Provider settings could not be updated."),
    {
      command: "manage-providers",
      tone: "default",
      targetLanguage: "Connection test",
      textLength: 0,
      providers: provider ? [provider] : [],
    },
  );
}
