import { ActionPanel, List, Action, Icon, Alert, confirmAlert, Color, Toast, showToast, Keyboard } from "@raycast/api";
import { useProviders } from "./lib/providers/useProviders";
import { ProviderForm } from "./lib/ui/CustomProviderView/ProviderForm";
import { ModelForm } from "./lib/ui/CustomProviderView/ModelForm";
import { CustomProvider, CustomModel } from "./lib/providers/types";
import { Shortcut } from "./lib/ui/shortcut";
import { OLLAMA_LOCAL_PROVIDER_ID } from "./lib/providers/storage";

export default function Command() {
  const { providers, isLoading, error, removeProvider, removeModel, revalidate, syncProviderModels } = useProviders();

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={providers.length > 0}
      actions={
        <ActionPanel>
          {!error && <AddNewProviderAction onSave={revalidate} />}
          <ReloadConfigAction onReload={revalidate} />
        </ActionPanel>
      }
    >
      {error && (
        <List.EmptyView
          title="Error Loading Providers"
          description={"An error occurred while loading providers from settings"}
          icon={Icon.ExclamationMark}
        />
      )}
      {!isLoading && !error && providers.length === 0 && (
        <List.EmptyView title="No custom providers found" description={"Add a provider to get started"} />
      )}
      {providers.length > 0 &&
        providers.map((provider) => (
          <List.Section
            key={provider.id}
            title={provider.name}
            subtitle={provider.id === OLLAMA_LOCAL_PROVIDER_ID ? "Built-in" : `${provider.models.length} models`}
          >
            {provider.models.length === 0 && (
              <List.Item
                key={`${provider.id}-add-model`}
                title={provider.id === OLLAMA_LOCAL_PROVIDER_ID ? "Set Up Ollama" : "Add Model"}
                icon={Icon.Plus}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title={provider.name}>
                      {provider.id !== OLLAMA_LOCAL_PROVIDER_ID && (
                        <AddNewModelAction provider={provider} onSave={revalidate} />
                      )}
                      <SyncProviderModelsAction provider={provider} syncProviderModels={syncProviderModels} />
                      <EditProviderAction
                        provider={provider}
                        onSave={revalidate}
                        title={provider.id === OLLAMA_LOCAL_PROVIDER_ID ? "Configure Ollama" : undefined}
                      />
                      {provider.id !== OLLAMA_LOCAL_PROVIDER_ID && (
                        <RemoveProviderAction provider={provider} removeProvider={removeProvider} />
                      )}
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Configuration">
                      <AddNewProviderAction onSave={revalidate} />
                      <ReloadConfigAction onReload={revalidate} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            )}
            {provider.models.map((model) => (
              <List.Item
                key={model.id}
                title={model.name}
                icon={Icon.Box}
                detail={
                  <List.Item.Detail
                    markdown={model.description}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Name" text={model.name} />
                        <List.Item.Detail.Metadata.Label title="Provider" text={provider.name} />
                        <List.Item.Detail.Metadata.Label title="Base URL" text={provider.base_url} />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Context" text={formatContextTokens(model.context)} />
                        {model.abilities && Object.keys(model.abilities).length > 0 && (
                          <>
                            <List.Item.Detail.Metadata.TagList title="Capabilities">
                              {Object.entries(model.abilities).map(([abilityName, ability]) => {
                                if (ability?.supported) {
                                  const getAbilityProps = (
                                    name: string,
                                  ): { color: Color; icon: Icon; text: string } => {
                                    switch (name) {
                                      case "temperature":
                                        return { color: Color.Orange, icon: Icon.Temperature, text: "Temperature" };
                                      case "vision":
                                        return { color: Color.Blue, icon: Icon.Image, text: "Vision" };
                                      case "system_message":
                                        return { color: Color.Green, icon: Icon.Message, text: "System Message" };
                                      case "tools":
                                        return { color: Color.Purple, icon: Icon.WrenchScrewdriver, text: "Tools" };
                                      case "reasoning_effort":
                                        return { color: Color.Yellow, icon: Icon.LightBulb, text: "Reasoning Effort" };
                                      default:
                                        return { color: Color.SecondaryText, icon: Icon.Circle, text: name };
                                    }
                                  };

                                  const abilityProps = getAbilityProps(abilityName);
                                  return <List.Item.Detail.Metadata.TagList.Item key={abilityName} {...abilityProps} />;
                                }
                                return null;
                              })}
                            </List.Item.Detail.Metadata.TagList>
                          </>
                        )}
                        {provider.additional_parameters && Object.keys(provider.additional_parameters).length > 0 && (
                          <>
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="Additional Parameters" />
                            {Object.entries(provider.additional_parameters).map(([key, value]) => (
                              <List.Item.Detail.Metadata.Label
                                key={key}
                                title={key}
                                text={typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                              />
                            ))}
                          </>
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title={model.name}>
                      <Action.Push
                        title="Edit Model"
                        icon={{ source: Icon.Pencil }}
                        target={<ModelForm provider={provider} model={model} onSave={revalidate} />}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                      />
                      <DuplicateModelAction provider={provider} model={model} onSave={revalidate} />
                      <RemoveModelAction provider={provider} model={model} removeModel={removeModel} />
                    </ActionPanel.Section>

                    <ActionPanel.Section title={provider.name}>
                      <AddNewModelAction provider={provider} onSave={revalidate} />
                      <SyncProviderModelsAction provider={provider} syncProviderModels={syncProviderModels} />
                      <EditProviderAction provider={provider} onSave={revalidate} />
                      <RemoveProviderAction provider={provider} removeProvider={removeProvider} />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Configuration">
                      <AddNewProviderAction onSave={revalidate} />
                      <ReloadConfigAction onReload={revalidate} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}

function AddNewProviderAction({ onSave }: { onSave: () => void }) {
  return (
    <Action.Push
      title="Add New Provider"
      icon={Icon.Plus}
      target={<ProviderForm onSave={onSave} />}
      shortcut={Shortcut.NewProvider}
    />
  );
}

function AddNewModelAction({ provider, onSave }: { provider: CustomProvider; onSave: () => void }) {
  return (
    <Action.Push
      title="Add New Model"
      icon={Icon.Plus}
      target={<ModelForm provider={provider} onSave={onSave} />}
      shortcut={Keyboard.Shortcut.Common.New}
    />
  );
}

function DuplicateModelAction({
  provider,
  model,
  onSave,
}: {
  provider: CustomProvider;
  model: CustomModel;
  onSave: () => void;
}) {
  const duplicatedModel: CustomModel = {
    ...model,
    id: `${model.id}-copy`,
    name: `Duplicated ${model.name}`,
  };
  return (
    <Action.Push
      title="Duplicate Model"
      icon={Icon.Duplicate}
      target={<ModelForm provider={provider} model={duplicatedModel} onSave={onSave} />}
      shortcut={Shortcut.Duplicate}
    />
  );
}

function RemoveModelAction({
  provider,
  model,
  removeModel,
}: {
  provider: CustomProvider;
  model: CustomModel;
  removeModel: (providerId: string, modelId: string) => void;
}) {
  return (
    <Action
      title="Remove Model"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={Shortcut.Remove}
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: "Remove Model",
          message: `Are you sure you want to remove model "${model.name}" from provider "${provider.name}"? This action cannot be undone.`,
          primaryAction: {
            title: "Remove",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (confirmed) {
          await removeModel(provider.id, model.id);
        }
      }}
    />
  );
}

function SyncProviderModelsAction({
  provider,
  syncProviderModels,
}: {
  provider: CustomProvider;
  syncProviderModels: (provider: CustomProvider, signal?: AbortSignal) => Promise<number>;
}) {
  return (
    <Action
      title="Sync Models"
      icon={Icon.ArrowClockwise}
      onAction={async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: `Syncing ${provider.name} models` });
        try {
          const count = await syncProviderModels(provider);
          toast.style = Toast.Style.Success;
          toast.title = `Synced ${count} models`;
          toast.message = provider.name;
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Model sync failed";
          toast.message = error instanceof Error ? error.message : "Unknown error";
        }
      }}
    />
  );
}

function EditProviderAction({
  provider,
  onSave,
  title = "Edit Provider",
}: {
  provider: CustomProvider;
  onSave: () => void;
  title?: string;
}) {
  return (
    <Action.Push
      title={title}
      icon={{ source: Icon.Pencil }}
      target={<ProviderForm provider={provider} onSave={onSave} />}
      shortcut={Shortcut.EditProvider}
    />
  );
}

function RemoveProviderAction({
  provider,
  removeProvider,
}: {
  provider: CustomProvider;
  removeProvider: (providerId: string) => void;
}) {
  return (
    <Action
      title="Remove Provider"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={Shortcut.Remove}
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: "Remove Provider",
          message: `Are you sure you want to remove "${provider.name}"? This action cannot be undone.`,
          primaryAction: {
            title: "Remove",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (confirmed) {
          await removeProvider(provider.id);
        }
      }}
    />
  );
}

function ReloadConfigAction({ onReload }: { onReload: () => void }) {
  return (
    <Action
      title="Reload Config File"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onReload}
    />
  );
}

function formatContextTokens(context: number): string {
  if (context >= 1_000_000) {
    const millions = context / 1_000_000;
    const value = millions % 1 === 0 ? `${millions}` : `${millions.toFixed(1)}`;
    return `${value}M tokens`;
  }
  if (context >= 1_000) {
    const thousands = context / 1_000;
    const value = thousands % 1 === 0 ? `${thousands}` : `${Math.round(thousands)}`;
    return `${value}k tokens`;
  }
  return `${context} tokens`;
}
