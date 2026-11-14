import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ManageProviders } from "./manage-providers";
import { enabledProviders, loadProviderSettings } from "./core/provider-settings";
import { useState } from "react";
import { describeError, InvalidSettingsError } from "./core/errors";
import { applyModelChoices, clearModelChoice, listModels, saveModelChoice } from "./core/models";
import { PROVIDERS, type ProviderConfig, type ProviderId } from "./core/providers";
import { SettingsErrorView } from "./raycast/settings-error";
import { localStore } from "./raycast/storage";

export default function ChooseModelCommand() {
  return <ChooseModel />;
}

interface ChooseModelProps {
  readonly onChange?: (() => void) | undefined;
}

export function ChooseModel({ onChange }: ChooseModelProps) {
  const { data: settings, error, revalidate } = usePromise(() => loadProviderSettings(localStore), []);
  if (error) {
    if (!(error instanceof InvalidSettingsError)) {
      throw error;
    }
    return <SettingsErrorView error={error} />;
  }
  return settings ? (
    <ModelList providers={enabledProviders(settings)} onChange={onChange} reloadSettings={() => void revalidate()} />
  ) : (
    <List isLoading />
  );
}

function ModelList({
  providers,
  onChange,
  reloadSettings,
}: ChooseModelProps & {
  readonly providers: readonly ProviderConfig[];
  readonly reloadSettings: () => void;
}) {
  const [providerId, setProviderId] = useState<string>(providers[0]?.id ?? "");
  const provider = providers.find(({ id }) => id === providerId) ?? providers[0];
  const { data: active, revalidate } = usePromise(
    (configured: readonly ProviderConfig[]) => applyModelChoices(localStore, configured),
    [providers],
  );
  const models = usePromise(
    async (selected: ProviderConfig | undefined) => (selected ? listModels(fetch, selected) : Promise.resolve([])),
    [provider],
  );
  const activeModel = active?.find(({ id }) => id === provider?.id)?.model;

  const changeModel = async (id: ProviderId, change: () => Promise<void>, message: string) => {
    await change();
    await revalidate();
    onChange?.();
    await showToast({ style: Toast.Style.Success, title: PROVIDERS[id].name, message });
  };

  const commonActions = provider ? (
    <ActionPanel.Section>
      <Action
        title="Use Saved Model"
        icon={Icon.ArrowCounterClockwise}
        onAction={() =>
          void changeModel(provider.id, () => clearModelChoice(localStore, provider.id), `Back to ${provider.model}`)
        }
      />
      <Action.Push
        title="Manage Providers"
        icon={Icon.Key}
        target={
          <ManageProviders
            onChange={() => {
              reloadSettings();
              onChange?.();
            }}
          />
        }
      />
    </ActionPanel.Section>
  ) : (
    <Action.Push
      title="Manage Providers"
      icon={Icon.Key}
      target={
        <ManageProviders
          onChange={() => {
            reloadSettings();
            onChange?.();
          }}
        />
      }
    />
  );

  return (
    <List
      isLoading={models.isLoading}
      searchBarPlaceholder="Search models"
      searchBarAccessory={
        <List.Dropdown tooltip="Provider" value={provider?.id ?? ""} onChange={setProviderId}>
          {providers.map(({ id }) => (
            <List.Dropdown.Item key={id} value={id} title={PROVIDERS[id].name} />
          ))}
        </List.Dropdown>
      }
    >
      {provider === undefined ? (
        <List.EmptyView
          icon={Icon.Key}
          title="No provider configured"
          description="Add and enable a provider in Manage Providers first."
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      ) : models.error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load models"
          description={`${describeError(models.error).message}. You can still enter a model in Manage Providers.`}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      ) : (
        (models.data ?? []).map((model) => (
          <List.Item
            key={model}
            title={model}
            icon={model === activeModel ? Icon.CheckCircle : Icon.Circle}
            accessories={model === activeModel ? [{ tag: "Active" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Use Model"
                  icon={Icon.Checkmark}
                  onAction={() =>
                    void changeModel(
                      provider.id,
                      () => saveModelChoice(localStore, provider.id, model),
                      `Now using ${model}`,
                    )
                  }
                />
                {commonActions}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
