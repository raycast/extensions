import { ActionPanel, List, Action, Icon, Alert, confirmAlert, Color } from "@raycast/api";
import { useProviders } from "./hooks/useProviders";
import { ProviderForm } from "./components/views/ProviderForm";
import { PROVIDERS_FILE_PATH } from "./utils/yaml-handler";
import { Provider, Model } from "./types";

export default function Command() {
  const { providers, isLoading, error, removeProvider, removeModel, loadProviders } = useProviders();

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={providers.length > 0}
      actions={
        <ActionPanel>
          {!error && <AddNewProviderAction onSave={loadProviders} />}
          <OpenConfigurationFileAction />
          <ReloadConfigAction loadProviders={loadProviders} />
        </ActionPanel>
      }
    >
      {error && (
        <List.EmptyView
          title="YAML Parsing Error"
          description={"Copy Logs to see error details"}
          icon={Icon.ExclamationMark}
        />
      )}
      {!isLoading && !error && providers.length === 0 && (
        <List.EmptyView title="No providers found" description="Add a new provider to get started" icon={Icon.Info} />
      )}
      {providers.length > 0 &&
        providers.map((provider) => (
          <List.Section key={provider.id} title={provider.name}>
            {provider.models?.map((model) => (
              <List.Item
                key={model.id}
                title={model.name}
                icon={Icon.Box}
                detail={
                  <List.Item.Detail
                    markdown={model.description}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Provider ID" text={provider.id} />
                        <List.Item.Detail.Metadata.Label title="Provider Name" text={provider.name} />
                        <List.Item.Detail.Metadata.Label title="Base URL" text={provider.base_url} />

                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Model ID" text={model.id} />
                        <List.Item.Detail.Metadata.Label title="Model Name" text={model.name} />
                        <List.Item.Detail.Metadata.Label title="Context" text={model.context.toString()} />
                        {model.description && (
                          <List.Item.Detail.Metadata.Label title="Description" text={model.description} />
                        )}
                        {model.abilities && Object.keys(model.abilities).length > 0 && (
                          <>
                            <List.Item.Detail.Metadata.TagList title="Abilities">
                              {Object.entries(model.abilities).map(([abilityName, ability]) => {
                                if (ability?.supported) {
                                  // Map ability names to colors
                                  const getAbilityColor = (name: string): Color => {
                                    switch (name) {
                                      case "temperature":
                                        return Color.Orange;
                                      case "vision":
                                        return Color.Blue;
                                      case "system_message":
                                        return Color.Green;
                                      case "tools":
                                        return Color.Purple;
                                      case "reasoning_effort":
                                        return Color.Yellow;
                                      default:
                                        return Color.SecondaryText;
                                    }
                                  };

                                  return (
                                    <List.Item.Detail.Metadata.TagList.Item
                                      key={abilityName}
                                      text={abilityName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                      color={getAbilityColor(abilityName)}
                                    />
                                  );
                                }
                                return null;
                              })}
                            </List.Item.Detail.Metadata.TagList>
                          </>
                        )}

                        {provider.api_keys && Object.keys(provider.api_keys).length > 0 && (
                          <>
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="API Keys" />
                            {Object.entries(provider.api_keys).map(([key, value]) => (
                              <List.Item.Detail.Metadata.Label
                                key={key}
                                title={key}
                                text={value ? "•••••••••••••" : value}
                              />
                            ))}
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
                        title="Edit"
                        icon={{ source: Icon.Pencil }}
                        target={<ProviderForm provider={provider} onSave={loadProviders} modelId={model.id} />}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                      />
                      <RemoveModelAction provider={provider} model={model} removeModel={removeModel} />
                    </ActionPanel.Section>
                    <ActionPanel.Section title={provider.name}>
                      <RemoveProviderAction provider={provider} removeProvider={removeProvider} />
                    </ActionPanel.Section>

                    <AddNewProviderAction onSave={loadProviders} />
                    <ActionPanel.Section>
                      <OpenConfigurationFileAction />
                      <ReloadConfigAction loadProviders={loadProviders} />
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
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );
}

function OpenConfigurationFileAction() {
  return (
    <Action.Open
      title="Open Config File"
      icon={Icon.Document}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      target={PROVIDERS_FILE_PATH}
    />
  );
}

function RemoveModelAction({
  provider,
  model,
  removeModel,
}: {
  provider: Provider;
  model: Model;
  removeModel: (providerId: string, modelId: string) => void;
}) {
  return (
    <Action
      title="Remove Model"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
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
          removeModel(provider.id, model.id);
        }
      }}
    />
  );
}

function RemoveProviderAction({
  provider,
  removeProvider,
}: {
  provider: Provider;
  removeProvider: (providerId: string) => void;
}) {
  return (
    <Action
      title="Remove Provider"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
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
          removeProvider(provider.id);
        }
      }}
    />
  );
}

function ReloadConfigAction({ loadProviders }: { loadProviders: () => void }) {
  return (
    <Action
      title="Reload Config File"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={loadProviders}
    />
  );
}
