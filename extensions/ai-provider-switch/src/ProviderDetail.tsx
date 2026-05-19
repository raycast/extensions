import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Model, Provider } from "./types";
import { maskApiKey } from "./mask";
import { testConnection } from "./api";
import ProviderForm from "./ProviderForm";
import ModelForm from "./ModelForm";
import RemoteModelList from "./RemoteModelList";

type SaveResult = boolean | Promise<boolean>;

interface ProviderDetailProps {
  provider: Provider;
  disabledModels: Model[];
  onDisableModel: (model: Model) => Promise<void>;
  onEnableModel: (modelId: string) => Promise<void>;
  onUpdate: (provider: Provider) => SaveResult;
  onDelete: () => Promise<boolean>;
}

export default function ProviderDetail({
  provider,
  disabledModels,
  onDisableModel,
  onEnableModel,
  onUpdate,
  onDelete,
}: ProviderDetailProps) {
  const { pop } = useNavigation();
  const [currentProvider, setCurrentProvider] = useState(provider);
  const [models, setModels] = useState(provider.models);
  const apiKeyNames = currentProvider.api_keys
    ? Object.keys(currentProvider.api_keys)
    : [];

  useEffect(() => {
    setCurrentProvider(provider);
    setModels(provider.models);
  }, [provider]);

  const updateProviderModels = useCallback(
    async (newModels: Model[]) => {
      const updatedProvider = { ...currentProvider, models: newModels };
      const saved = await onUpdate(updatedProvider);
      if (!saved) return false;

      setCurrentProvider(updatedProvider);
      setModels(newModels);
      return true;
    },
    [currentProvider, onUpdate],
  );

  const addModel = useCallback(
    async (model: Model) => {
      const newModels = [...models, model];
      return updateProviderModels(newModels);
    },
    [models, updateProviderModels],
  );

  const updateModel = useCallback(
    async (updated: Model, originalId: string) => {
      const newModels = models.map((m) => (m.id === originalId ? updated : m));
      return updateProviderModels(newModels);
    },
    [models, updateProviderModels],
  );

  const deleteModel = useCallback(
    async (modelId: string) => {
      if (
        await confirmAlert({
          title: "Delete Model?",
          message: `Delete model "${modelId}"?`,
          primaryAction: {
            title: "Delete",
            style: Alert.ActionStyle.Destructive,
          },
        })
      ) {
        const newModels = models.filter((m) => m.id !== modelId);
        await updateProviderModels(newModels);
      }
    },
    [models, updateProviderModels],
  );

  const deleteProviderAndLeaveDetail = useCallback(async () => {
    const deleted = await onDelete();
    if (deleted) {
      pop();
    }
  }, [onDelete, pop]);

  const testProviderConnection = useCallback(
    async (apiKeyName?: string) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: apiKeyName
          ? `Testing connection with ${apiKeyName}...`
          : "Testing connection...",
      });
      const result = await testConnection(currentProvider, apiKeyName);
      toast.style = result.success ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = result.message;
    },
    [currentProvider],
  );

  const batchAddModels = useCallback(
    async (newModelsData: Model[]) => {
      const existingIds = new Set(models.map((m) => m.id));
      const dedupedNewModels = newModelsData.filter(
        (m) => !existingIds.has(m.id),
      );
      if (dedupedNewModels.length === 0) return false;

      const updatedModels = [...models, ...dedupedNewModels];
      return updateProviderModels(updatedModels);
    },
    [models, updateProviderModels],
  );

  function abilitySummary(model: Model): string {
    const icons: string[] = [];
    if (model.abilities?.vision?.supported) icons.push("V");
    if (model.abilities?.tools?.supported) icons.push("T");
    if (model.abilities?.reasoning_effort?.supported) icons.push("R");
    return icons.join(" ");
  }

  const maskedKeys = currentProvider.api_keys
    ? Object.entries(currentProvider.api_keys)
        .map(([k, v]) => `${k}: ${maskApiKey(v)}`)
        .join(", ")
    : "None";

  return (
    <List
      key={`${currentProvider.id}-${models.map((m) => m.id).join(",")}`}
      navigationTitle={currentProvider.name}
      searchBarPlaceholder="Search models..."
    >
      <List.Section
        title={`${currentProvider.name} — ${currentProvider.base_url}`}
        subtitle={`API Keys: ${maskedKeys}`}
      >
        {models.map((model) => (
          <List.Item
            key={model.id}
            icon={Icon.Box}
            title={model.name}
            subtitle={model.id}
            accessories={[
              { text: `ctx: ${model.context}` },
              {
                tag: { value: abilitySummary(model) || "—", color: Color.Blue },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Model"
                  icon={Icon.Pencil}
                  target={
                    <ModelForm
                      model={model}
                      existingIds={models
                        .filter((m) => m.id !== model.id)
                        .map((m) => m.id)}
                      apiKeyNames={apiKeyNames}
                      onSave={(updated) => updateModel(updated, model.id)}
                    />
                  }
                />
                <Action.Push
                  title="Add Model"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={
                    <ModelForm
                      existingIds={models.map((m) => m.id)}
                      apiKeyNames={apiKeyNames}
                      onSave={addModel}
                    />
                  }
                />
                <Action
                  title="Disable Model"
                  icon={Icon.Pause}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => onDisableModel(model)}
                />
                <Action.Push
                  title="Duplicate Model"
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  target={(() => {
                    let newId = `${model.id}-copy`;
                    let counter = 1;
                    while (models.some((m) => m.id === newId)) {
                      newId = `${model.id}-copy-${counter}`;
                      counter++;
                    }
                    const newModel = {
                      ...model,
                      id: newId,
                      name: `${model.name} (Copy)`,
                    };
                    return (
                      <ModelForm
                        model={newModel}
                        existingIds={models.map((m) => m.id)}
                        apiKeyNames={apiKeyNames}
                        isDuplicate
                        onSave={addModel}
                      />
                    );
                  })()}
                />
                <ActionPanel.Section title="Provider">
                  <Action.Push
                    title="Edit Provider"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    target={
                      <ProviderForm
                        provider={currentProvider}
                        onSave={async (updatedProvider) => {
                          const saved = await onUpdate(updatedProvider);
                          if (!saved) return false;

                          setCurrentProvider(updatedProvider);
                          setModels(updatedProvider.models);
                          return true;
                        }}
                      />
                    }
                  />
                  <Action
                    title="Test Connection"
                    icon={Icon.Signal1}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => testProviderConnection()}
                  />
                  {apiKeyNames.length > 1 &&
                    apiKeyNames.map((apiKeyName) => (
                      <Action
                        key={`test-${apiKeyName}`}
                        title={`Test Connection with ${apiKeyName}`}
                        icon={Icon.Signal1}
                        onAction={() => testProviderConnection(apiKeyName)}
                      />
                    ))}
                  {apiKeyNames.length <= 1 ? (
                    <Action.Push
                      title="Query Remote Models"
                      icon={Icon.Download}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      target={
                        <RemoteModelList
                          provider={currentProvider}
                          apiKeyName={apiKeyNames[0]}
                          onAdd={batchAddModels}
                        />
                      }
                    />
                  ) : (
                    apiKeyNames.map((apiKeyName, index) => (
                      <Action.Push
                        key={`query-${apiKeyName}`}
                        title={`Query Remote Models with ${apiKeyName}`}
                        icon={Icon.Download}
                        shortcut={
                          index === 0
                            ? { modifiers: ["cmd"], key: "r" }
                            : undefined
                        }
                        target={
                          <RemoteModelList
                            provider={currentProvider}
                            apiKeyName={apiKeyName}
                            onAdd={batchAddModels}
                          />
                        }
                      />
                    ))
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Model"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteModel(model.id)}
                  />
                  <Action
                    title="Delete Provider"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={deleteProviderAndLeaveDetail}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {disabledModels.length > 0 && (
        <List.Section
          title="Disabled Models"
          subtitle={`${disabledModels.length}`}
        >
          {disabledModels.map((model) => (
            <List.Item
              key={`disabled-${model.id}`}
              icon={Icon.Pause}
              title={model.name}
              subtitle={model.id}
              accessories={[{ tag: { value: "Disabled", color: "#999" } }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Enable Model"
                    icon={Icon.Play}
                    onAction={() => onEnableModel(model.id)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {models.length === 0 && (
        <List.EmptyView
          title="No Models"
          description="Add a model or query remote models"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Model"
                icon={Icon.Plus}
                target={
                  <ModelForm
                    existingIds={[]}
                    apiKeyNames={apiKeyNames}
                    onSave={addModel}
                  />
                }
              />
              {apiKeyNames.length <= 1 ? (
                <Action.Push
                  title="Query Remote Models"
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  target={
                    <RemoteModelList
                      provider={currentProvider}
                      apiKeyName={apiKeyNames[0]}
                      onAdd={batchAddModels}
                    />
                  }
                />
              ) : (
                apiKeyNames.map((apiKeyName, index) => (
                  <Action.Push
                    key={`empty-query-${apiKeyName}`}
                    title={`Query Remote Models with ${apiKeyName}`}
                    icon={Icon.Download}
                    shortcut={
                      index === 0 ? { modifiers: ["cmd"], key: "r" } : undefined
                    }
                    target={
                      <RemoteModelList
                        provider={currentProvider}
                        apiKeyName={apiKeyName}
                        onAdd={batchAddModels}
                      />
                    }
                  />
                ))
              )}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
